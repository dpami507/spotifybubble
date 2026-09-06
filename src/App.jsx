import './App.css'

import ForceGraph3D from 'react-force-graph-3d';
import stc from 'string-to-color';

import React, { useState, useRef } from "react";

function FileLoader({ onFilesLoaded }) {

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    Promise.all(
        files.map((file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                resolve(JSON.parse(e.target.result));
              } catch (err) {
                reject(err);
              }
            };
            reader.onerror = reject;
            reader.readAsText(file);
          });
        })
    )
        .then((parsedFiles) => {
          onFilesLoaded(parsedFiles);
        })
        .catch((err) => {
          console.error("Error reading/parsing one or more files:", err);
        })
        .finally(() => {
          // Reset so the same file(s) can be re-selected later if needed
          event.target.value = '';
        });
  };

  return (
      <div className="file-upload">
        <input type="file" accept=".json" multiple onChange={handleFileChange} />
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
  let totalListenTime = 0;

  // useRef persists across renders instead of being recreated each time
  const songMapRef = useRef(new Map());
  const artistMapRef = useRef(new Map());

  function loadDataToMaps(data)
  {
    const songMap = songMapRef.current;
    const artistMap = artistMapRef.current;

    console.log("Loading data to maps");
    data?.forEach((song) => {
      let key = song.master_metadata_track_name + song.master_metadata_album_artist_name;
      if(!songMap.has(key))
      {
        songMap.set(key, [1, song.ms_played, song.master_metadata_track_name, song.master_metadata_album_artist_name]);

        totalListenTime += song.ms_played;

        if(song.master_metadata_track_name !== null)
        {
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
      }
      else
      {
        let theSong = songMap.get(key);
        let newPlays = theSong[0] + 1;
        let newPlayTime = theSong[1] + song.ms_played;
        songMap.set(key, [newPlays, newPlayTime, song.master_metadata_track_name, song.master_metadata_album_artist_name])
      }
    });
  }

  function mapToJSON()
  {
    const songMap = songMapRef.current;
    const artistMap = artistMapRef.current;

    console.log("Turning maps to JSON");

    let nodes = [];
    let links = [];

    nodes.push({id: "origin", name: "origin", val: 1});

    artistMap.forEach((songs, artist) => {
      let artistStr = `${artist} (${songs.length})`
      let artistNode = {id: artist, name: artistStr, val: songs.length, color: "grey"};
      nodes.push(artistNode);

      songs.forEach((song) => {
        links.push({source: artist, target: song});
      })

      links.push({source: "origin", target: artist});
    })

    songMap.forEach((value, key) => {
      let newColor = stc(value[3]);
      let nodeStr = `${value[2]} (${value[0]})`
      nodes.push({id: key, name: nodeStr, val: value[0], color: newColor});
    })

    return {nodes, links}
  }

  // Called with an array of parsed JSON blobs (one per uploaded file)
  function handleFilesLoaded(parsedFiles)
  {
    parsedFiles.forEach((data) => loadDataToMaps(data));
    setCreatedData(mapToJSON());

    printTime();
  }

  function handleClear()
  {
    songMapRef.current.clear();
    artistMapRef.current.clear();
    setCreatedData({});
  }

  // Usage in React Component
  function printTime() {
    console.log(totalListenTime);
    const days = Math.floor(totalListenTime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((totalListenTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((totalListenTime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalListenTime % (1000 * 60)) / 1000);

    console.log(`${days} days, ${hours} hours, ${minutes} minutes, ${seconds}`);
  }

  return (
      <div>
        <FileLoader onFilesLoaded={handleFilesLoaded} />
        <button onClick={handleClear}>Clear</button>
        <GraphComponent data={createdData} />
      </div>
  )
}

export default App