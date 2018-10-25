DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS weather;
DROP TABLE IF EXISTS yelp;
DROP TABLE IF EXISTS meetup;
DROP TABLE IF EXISTS movies;
DROP TABLE IF EXISTS hiking;

CREATE TABLE locations(
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude NUMERIC(8,6),
    longitude NUMERIC(9,6)
);

CREATE TABLE weathers (
    id SERIAL PRIMARY KEY,
    forecast VARCHAR(255),
    time VARCHAR(255),
    location_id INTEGER NOT NULL REFERENCES locations(id) 
);

CREATE TABLE yelp(
    id SERIAL PRIMARY KEY,


);

CREATE TABLE meetup(
    id SERIAL PRIMARY KEY,
    
);

CREATE TABLE movies(
    id SERIAL PRIMARY KEY,
    
);

CREATE TABLE hiking(
    id SERIAL PRIMARY KEY,
    
);