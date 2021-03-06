'use strict'


const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

require('dotenv').config();

const PORT = process.env.PORT;

const client = new pg.Client(process.env.DATA_BASE_URL)
client.connect();
client.on('err', err=>console.log(err));

const app = express();

app.use(cors());

function handleError(err, res){
  console.error(err);
  if(res){res.status(500).send(`sorry no peanuts`);}
}
app.listen(PORT, ()=>{console.log(`app is running on ${PORT}`)});


// location object stuff

app.get('/location', getLocation);

function Location(data, query){
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

Location.prototype.save = function(){
  let SQL = `
    INSERT INTO locations
        (search_query,formatted_query,latitude,longitude)
        VALUES($1,$2,$3,$4)`;
  let values = Object.values(this);
  client.query(SQL, values);
};
Location.fetchLocation = (query) =>{
  const URL = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
  return superagent.get(URL)
    .then(data =>{
      if(!data.body.results.length){ throw `NO DATA`;}
      else{
        let location = new Location(data.body.results[0],query);
        location.save();
        return location;
      }
    })
    .catch(console.err);
}

function getLocation(request, response){
    const locationHandler = {
        query: request.query.data,

        cacheHit: (results) =>{
            console.log('got data from SQL');
            response.send(results.row[0]);  
        },
        cacheMiss: () =>{
            Location.fetchLocation(request.query.data)
            .then(data => response.send(data))
        }
    };

    Location.lookupLocation(locationHandler);
}


Location.lookupLocation = (handler) =>{
  const SQL = `SELECT * FROM locations WHERE search_query=$1`;
  const values = [handler.query];
  return client.query(SQL, values)
    .then(results => {
      if(results.rowCount > 0){
        handler.cacheHit(results);
      }else{
        handler.cacheMiss();
      }
    })
    .catch(console.err);
}

// weather stuff

app.get('/weather',getWeather);


Weather.fetch = function (location){
  const URL = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
  return superagent.get(URL)
    .then(result => {
      const weatherSummaries = result.body.daily.data.map(day => {
        const summary = new Weather(day);
        summary.save(location.id);
        return summary;
      });
      return weatherSummaries;
    });
};


function Weather(data){
  this.time = new Date(data.time*1000).toString().slice(0,15);
  this.forecast = data.summary;
  this.location_id = data.location_id;
}
Weather.prototype.save = function(){
    let SQL = `
    INSERT INTO weathers
    (forecast,time,location_id)
      VALUES($1,$2,$3)`;
    let values = Object.values(this);
    client.query(SQL, values);
   };

   Weather.lookup = function(handler) {
    const SQL = `SELECT * FROM weathers WHERE location_id=$1;`;
    client.query(SQL, [handler.location.id])
      .then(result => {
        if(result.rowCount > 0) {
          console.log('Got data from SQL');
          handler.cacheHit(result);
        } else {
          console.log('Got data from API');
          handler.cacheMiss();
        }
      })
      .catch(error => handleError(error));
  };
  Weather.fetch = function (location){
    const URL = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
    return superagent.get(URL)
      .then(result => {
        const weatherSummaries = result.body.daily.data.map(day => {
          const summary = new Weather(day);
          summary.save(location.id);
          return summary;
        });
        return weatherSummaries;
      });
   };

   function getWeather(request, response){
    const handler = {
      cacheHit: function(result) {
        response.send(result.rows);
      },
      cacheMiss: function() {
        Weather.fetch(request.query.data)
          .then( results => response.send(results) )
          .catch( console.error );
      },
    };
    Weather.lookup(handler);
   }



// function getWeatherData(request, response){
//     const URL = `https://api.darksky.net/forecast/${process.env.DARKSKY_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;
//     return superagent.get(URL)
//         .then(results => {
//             const weatherArray = [];
//             results.body.daily.data.forEach((day)=>{
//                 weatherArray.push(new Weather(day, query));
//             })
//             response.send(weatherArray);
//         })
//         .catch(err => handleError(err,response));
// }


Weather.prototype.save = function(){
  let SQL = `
  INSERT INTO weathers
  (forecast,time,location_id)
    VALUES($1,$2,$3)`;
  let values = Object.values(this);
  client.query(SQL, values);
};

Weather.lookup = function(handler){
  const SQL = `SELECT * FROM weathers WHERE location_id=$1;`;
  client.query(SQL, [handler.location.id])
    .then(result => {
      if(result.rowCount > 0) {
        console.log('Got data from SQL');
        handler.cacheHit(result);
      } else {
        console.log('Got data from API');
        handler.cacheMiss();
      }
    })
    .catch(error => handleError(error));
};

// yelp
app.get('/yelp', getYelp);

function getYelp(request, response){

  const URL = (`https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`);
  return superagent.get(URL)
    .set({'Authorization' : `Bearer ${process.env.YELP_API_KEY}`})
    .then( results =>{
      const yelpArray = [];
      results.body.businesses.forEach((e)=>{
        yelpArray.push(new Yelp(e));

      })
      response.send(yelpArray);
    })
    .catch(err => handleError(err,response));

}

function Yelp(data){
  this.name = data.name;
}

// meetup
app.get('/meetups', getMeetup);
function getMeetup(request,response){
  const URL = `https://api.meetup.com/find/upcoming_events?key=${process.env.MEETUP_API_KEY}&sign=true&photo-host=public&page=20`;
  return superagent.get(URL)
    .then(results =>{
      const meetups = [];
      results.body.events.forEach((e)=>{
        meetups.push(new Meetup(e))
      })
      response.send(meetups);
    })
    .catch(err => handleError(err,response));
}

function Meetup(data){
  this.name = data.name;
  this.group = data.group.name;

}

// movies
app.get('/movies', getMovie);

function getMovie(request, response){
  let city = request.query.data.formatted_query.split(', ').slice(0,1);

  const URL = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&query=${city}&page=1&include_adult=false`;
  return superagent.get(URL)
    .then(results =>{
      const movieArray = [];
      results.body.results.forEach((e)=>{
        movieArray.push(new Movie(e))
      })
      response.send(movieArray);
    })
    .catch(err => handleError(err,response));

}

function Movie(data){
  this.title = data.title;


}

// hiking
app.get('/trails', getHike);
function getHike(request,response){
  const URL = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&maxDistance=10&key=${process.env.HIKE_API_KEY}`;
  return superagent.get(URL)
    .then(results =>{
      const hikeArray = [];
      results.body.trails.forEach((e)=>{
        hikeArray.push(new Hike(e));
      })
      response.send(hikeArray);
    })
    .catch(err => handleError(err,response));
}

function Hike(data){
  this.name = data.name;

}
