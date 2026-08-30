import './App.css'
import {useRef} from "react";

import data from './tempData.json' ;
import ForceGraph3D from 'react-force-graph-3d';
import stc from 'string-to-color';

function App() {

  const map= new Map();
  const artistMap = new Map();

  function loadDataToMap()
  {
    data.forEach((song) => {
      // Check if the map has it
      let key = song.master_metadata_track_name + "||" +  song.master_metadata_album_artist_name;
      if(!map.has(key))
      {
        // Default set for when we don't have it in the map
        map.set(key, [1, song.ms_played, song.master_metadata_track_name, song.master_metadata_album_artist_name]);

        // We only need to set linking here
        let artists = song.master_metadata_album_artist_name.split(', ');
        artists.forEach((artist) => {
          if(artistMap.has(artist))
          {
            let list = artistMap.get(artist);
            list.push(key);
            artistMap.set(artist, list);
          }
          else
          {
            artistMap.set(artist, [key]);
          }
        })
      }
      else
      {
        // Add to it
        let theSong = map.get(key);
        let newPlays = theSong[0] + 1;
        let newPlayTime = theSong[1] + song.ms_played;
        map.set(key, [newPlays, newPlayTime, song.master_metadata_track_name, song.master_metadata_album_artist_name])
      }
    });
  }
  function mapToJSON()
  {
    // Create empty nodes json
    let nodes = {"nodes": []}
    nodes = []
    // Create empty links json
    let links = {"links": []}
    links = []

    // origin node
    nodes.push({id: "origin", name: "origin", val: 1});

    // Create artist nodes and add links
    artistMap.forEach((songs, artist) => {

      let artistStr = `${artist} (${songs.length})`
      let newData = {id: artist, name: artistStr, val: songs.length, color: "grey"};
      nodes.push(newData);

      // Go through the songs they are credited too
      artistMap.get(artist).forEach((song) => {
        let newLink = {source: artist, target: song};
        links.push(newLink);
      })

      // Have all artist nodes come from central node
      let newLink = {source: "origin", target: artist};
      links.push(newLink);
    })

    // Push node data to nodes
    map.forEach((value, key) => {

      // generate a color from the artist
      let newColor = stc(value[3]);
      let nodeStr = `${value[2]} (${value[0]})`

      let newData = {id: key, name: nodeStr, val: value[0], color: newColor};
      nodes.push(newData);
    })

    return {nodes, links}
  }

  loadDataToMap()
  mapToJSON()

  let myData = mapToJSON()

  return (
      <ForceGraph3D
          graphData={myData}
          nodeAutoColorBy="color"
      />
  )
}

export default App
