import { useState, useEffect } from "react";

import "./App.css";

function App() {
  const [apiText, setApiText] = useState<string>("");

  useEffect(() => {
    fetch("/api/")
      .then((res) => res.text())
      .then((data) => {
        setApiText(data);
      });
  }, []);
  return (
    <>
      <p>{apiText}</p>
    </>
  );
}

export default App;
