import './App.css';
import { LiveCanvasPage } from './LiveCanvasPage';
import { useEffect, useState } from "react";

export default function App() {

  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => 
      {
        try {
          console.log("App.js: initializing client SDK initialized");
          await microsoftTeams.app.initialize();
          microsoftTeams.app.notifyAppLoaded();
          microsoftTeams.app.notifySuccess();
          setInitialized(true);
        } catch (error) {
          console.error(error);
        }    
      };

      if (inTeams()) {
        console.log("App.js: initializing client SDK");
        initialize();
      }
  });

  const appReady = (inTeams() && initialized) || !inTeams();

  
  return (
        <LiveCanvasPage />
  );
}
