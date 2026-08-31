import './App.css'

import ForceGraph3D from 'react-force-graph-3d';
import stc from 'string-to-color';

import React, { useState, useEffect } from "react";

function FileLoader({onFileLoaded}) {

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        onFileLoaded(data);
      };
      reader.readAsText(file);
    }
  }
  return (
      <div className="file-upload">
        <input type="file" accept=".json" onChange={handleFileChange} />
      </div>
  )
}
function GraphComponent({data}) {
  if(!data || !data.nodes || data.nodes.length < 1)
  {
    console.log("No data");
    return (
        <div className="graph-err">
          <p>No Graph Data Available</p>
        </div>
    )
  }
  else
  {
    console.log("Data Available");
    console.log(data.size);
    return (
        <ForceGraph3D
            graphData={data}
            nodeAutoColorBy="color"
        />
    )
  }
}

function App() {

  const [createdData, setCreatedData] = useState({});
  const [fileData, setFileData] = useState(null);

  const songMap= new Map();
  const artistMap = new Map();

  function loadDataToMaps(data)
  {
    console.log("Loading data to maps");
    data?.forEach((song) => {
      // Create the key to store it
      let key = song.master_metadata_track_name + song.master_metadata_album_artist_name;
      // Check if the map has it
      if(!songMap.has(key)) // doesnt have it
      {
        // Default set for when we don't have it in the map
        songMap.set(key, [1, song.ms_played, song.master_metadata_track_name, song.master_metadata_album_artist_name]);

        // We only need to set linking here
        // Split artists by commas
        let artists = song.master_metadata_album_artist_name.split(', ');
        // foreach artist check the artist map and push it
        artists.forEach((artist) => {
          if(artistMap.has(artist)) // has the artist
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
        let theSong = songMap.get(key);
        let newPlays = theSong[0] + 1;
        let newPlayTime = theSong[1] + song.ms_played;
        songMap.set(key, [newPlays, newPlayTime, song.master_metadata_track_name, song.master_metadata_album_artist_name])
      }
    });
  }
  function mapToJSON()
  {
    console.log("Turning maps to JSON");
    if(songMap.length <= 0 || artistMap.length <= 0) console.log("no data");

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

      // Create the display string for the artist node
      let artistStr = `${artist} (${songs.length})`
      let artistNode = {id: artist, name: artistStr, val: songs.length, color: "grey"};
      nodes.push(artistNode);

      // Go through the songs they are credited to and connect them
      artistMap.get(artist).forEach((song) => {
        let newLink = {source: artist, target: song};
        links.push(newLink);
      })

      // Have all artist nodes come from central node
      let newLink = {source: "origin", target: artist};
      links.push(newLink);
    })

    // Push node data to nodes
    songMap.forEach((value, key) => {

      // generate a color from the artist string
      let newColor = stc(value[3]);
      let nodeStr = `${value[2]} (${value[0]})`

      // Create a new node
      let newNode = {id: key, name: nodeStr, val: value[0], color: newColor};
      nodes.push(newNode);
    })

    return {nodes, links}
  }

  // Load data when fileDataChanges
  useEffect(() => {
    if(!fileData) return;

    loadDataToMaps(fileData);
    setCreatedData(mapToJSON());
  }, [fileData]);

  return (
    <div>
      <FileLoader onFileLoaded={setFileData} />
      <GraphComponent data={createdData} />
    </div>
  )
}

export default App
