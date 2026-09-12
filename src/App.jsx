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
      <div className="file-loader">
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
function DataComponent({data})
{
  if(!data || data.length <= 0)
  {
    return (<div></div>);
  }
  const topListenArtists = data[0];
  const topSongArtists = data[1];
  const topSongs = data[2];

  return (
      <div className="data-container">
        <h3>Listen Stats:</h3>
        <ul>
          <li>Total Listen Time: <br/> {data[3]}</li>
          <li>Number of Songs: {data[4]}</li>
          <li>Number of Artists: {data[5]}</li>
        </ul>

        <h3>Top Artists (Listen Time)</h3>
        <ol>
          {topListenArtists.map((item, index) => (
            <li key={index}>{item[0]} - {Math.round((item[1][0] / 1000) / 60)} min</li>
          ))}
        </ol>

        <h3>Top Artists (Song Count)</h3>
        <ol>
          {topSongArtists.map((item, index) => (
              <li key={index}>{item[0]} - {item[1][1].length} songs</li>
          ))}
        </ol>

        <h3>Top Songs</h3>
        <ol>
          {topSongs.map((item, index) => (
              <li key={index}>{item[1][2]} - {item[1][0]}x</li>
          ))}
        </ol>
      </div>
  )
}

function App() {

  const [createdData, setCreatedData] = useState({});
  const totalListenTimeRef = useRef(0);
  const topDataRef = useRef([]);

  const songNodeCountRef = useRef(0);
  const artistNodeCountRef = useRef(0);

  //(trackName + artistName, [playCount, playTime, trackName, artistName])
  const songMapRef = useRef(new Map());
  //(artist, [timePlayed, [listOfSongs]])
  const artistMapRef = useRef(new Map());

  function loadDataToMaps(data)
  {
    const songMap = songMapRef.current;
    const artistMap = artistMapRef.current;

    console.log("Loading data to maps");
    data?.forEach((song) => {
      let key = song.master_metadata_track_name + song.master_metadata_album_artist_name;
      const isNewSong = !songMap.has(key);

      if(isNewSong) {
        songMap.set(key, [1, song.ms_played, song.master_metadata_track_name, song.master_metadata_album_artist_name]);
      }
      else {
        const theSong = songMap.get(key);
        songMap.set(key, [theSong[0] + 1, theSong[1] + song.ms_played, theSong[2], theSong[3]]);
      }

      // now counts every play, not just the first
      totalListenTimeRef.current += song.ms_played;

      if(song.master_metadata_track_name)
      {
        const artists = song.master_metadata_album_artist_name.split(', ');
        artists.forEach((artist) => {
          if(artistMap.has(artist)) {
            const data = artistMap.get(artist); // Get data
            const list = data[1];               // Get the list of songs

            if(isNewSong) list.push(key);
            artistMap.set(artist, [data[0] + song.ms_played, list]);
          } else
          {
            artistMap.set(artist, [song.ms_played, [key]]);
          }
        })
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

    //nodes.push({id: "origin", name: "origin", val: 1});

    artistMap.forEach((data, artist) => {
      let songs = data[1];
      let artistStr = `${artist} (${songs.length})`
      let artistNode = {id: artist, name: artistStr, val: songs.length, color: "grey"};
      nodes.push(artistNode);

      songs.forEach((song) => {
        links.push({source: artist, target: song});
      })

      //links.push({source: "origin", target: artist});
    })

    songMap.forEach((value, key) => {
      let newColor = stc(value[3]);
      let nodeStr = `${value[2]} (${value[0]})`
      nodes.push({id: key, name: nodeStr, val: value[0], color: newColor});
    })

    return {nodes, links}
  }

  function findTopVariables()
  {
    // Top artists based on playTime
    const topListenArtists = [...artistMapRef.current]
        .sort((a, b) => b[1][0] - a[1][0])
        .slice(0, 10);

    // Top artists based on song count
    const topSongArtists = [...artistMapRef.current]
        .sort((a, b) => b[1][1].length - a[1][1].length)
        .slice(0, 10);

    // Top songs based on play count
    const topSongs = [...songMapRef.current]
        .sort((a, b) => b[1][0] - a[1][0])
        .slice(0, 10);

    topDataRef.current = [topListenArtists, topSongArtists, topSongs, getTime().toString(), songMapRef.current.size, artistMapRef.current.size];
  }

  // Called with an array of parsed JSON blobs (one per uploaded file)
  function handleFilesLoaded(parsedFiles)
  {
    parsedFiles.forEach((data) => loadDataToMaps(data));
    setCreatedData(mapToJSON());
    findTopVariables();
  }

  function handleClear()
  {
    songMapRef.current.clear();
    artistMapRef.current.clear();
    totalListenTimeRef.current = 0;
    setCreatedData({});
  }

  // Usage in React Component
  function getTime() {
    let time = totalListenTimeRef.current;
    const days = Math.floor(time / (1000 * 60 * 60 * 24));
    const hours = Math.floor((time % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((time % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((time % (1000 * 60)) / 1000);

    return (`${days}d, ${hours}h, ${minutes}m, ${seconds}s`);
  }

  return (
      <div>
        <div className="user-options">
          <FileLoader onFilesLoaded={handleFilesLoaded} />
          <button onClick={handleClear}>Clear</button>
        </div>
        <GraphComponent
            data={createdData}
            d3AlphaDecay ={0.01}
        />
        <DataComponent
            data={topDataRef.current}
        />
      </div>
  )
}

export default App