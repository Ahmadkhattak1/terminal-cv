// src/components/Terminal.js
import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';
import { db, analytics } from '../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { Typography } from '@mui/material'; // If using Material-UI for error display

function Terminal() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([
    {
      type: 'response',
      text: "Welcome to Ahmad Khattak's CV Terminal.\nType 'help' to see available commands.",
    },
  ]);
  const [commands, setCommands] = useState([]); // Commands as an array
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [error, setError] = useState(null); // State for error messages
  const terminalRef = useRef(null);

  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const cmdCollection = collection(db, 'commands');
        const q = query(cmdCollection, orderBy('createdAt', 'asc')); // Removed the where clause
        const cmdSnapshot = await getDocs(q);
        const cmds = cmdSnapshot.docs.map((doc) => ({
          name: doc.data().name ? doc.data().name.toLowerCase() : doc.id.toLowerCase(),
          description: doc.data().description,
          response: doc.data().response || '',
        }));

        setCommands(cmds);
        console.log('Fetched commands:', cmds); // For debugging
      } catch (error) {
        console.error('Error fetching commands:', error);
        setHistory((prevHistory) => [
          ...prevHistory,
          { type: 'response', text: `Error fetching commands: ${error.message}` },
        ]);
      }
    };

    fetchCommands();
  }, []); // Removed [db] from dependencies

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (trimmedInput === '') return;

    setHistory((prevHistory) => [
      ...prevHistory,
      { type: 'command', text: trimmedInput },
    ]);
    setCommandHistory((prevCommandHistory) => [...prevCommandHistory, trimmedInput]);
    setHistoryIndex(-1);
    handleCommand(trimmedInput);
    setInput('');
  };

  const handleCommand = (cmd) => {
    const commandName = cmd.toLowerCase();

    // Handle built-in commands first
    if (commandName === 'clear') {
      setHistory([]);
      return;
    }

    if (commandName === 'help') {
      if (commands.length === 0) {
        setHistory((prevHistory) => [
          ...prevHistory,
          { type: 'response', text: 'No available commands.' },
        ]);
        return;
      }

      const cmdList = commands
        .map((cmd) => `${cmd.name} - ${cmd.description}`)
        .join('\n');
      setHistory((prevHistory) => [
        ...prevHistory,
        { type: 'response', text: `Available commands:\n${cmdList}` },
      ]);
      return;
    }

    // Search for the command in the commands array
    const foundCommand = commands.find((c) => c.name === commandName);
    if (foundCommand) {
      const response = foundCommand.response || 'No response defined.';
      setHistory((prevHistory) => [
        ...prevHistory,
        { type: 'response', text: response },
      ]);

      if (analytics) {
        logEvent(analytics, 'command_executed', { command: commandName });
      }
    } else {
      setHistory((prevHistory) => [
        ...prevHistory,
        {
          type: 'response',
          text: `'${commandName}' is not recognized. Type 'help' to see available commands.`,
        },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const matches = commands
        .map((cmd) => cmd.name)
        .filter((cmdName) => cmdName.startsWith(input.toLowerCase()));
      if (matches.length === 1) {
        setInput(matches[0]);
      } else if (matches.length > 1) {
        setHistory((prevHistory) => [
          ...prevHistory,
          { type: 'response', text: matches.join('    ') },
        ]);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const newIndex = historyIndex + 1;
      if (newIndex < commandHistory.length) {
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="terminal">
      {/* Top Bar */}
      <div className="terminal-top-bar">
        <div className="window-controls">
          <span className="close"></span>
          <span className="minimize"></span>
          <span className="maximize"></span>
        </div>
        <div className="terminal-title">Terminal - Ahmad Khattak's CV</div>
      </div>

      {/* Terminal Output */}
      <div className="terminal-output" ref={terminalRef}>
        {history.map((entry, index) => {
          if (!entry || !entry.type || !entry.text) {
            return null;
          }

          if (entry.type === 'command') {
            return (
              <div key={index} className="terminal-command">
                <span className="terminal-prompt">user@cv:~$</span>
                <span className="command-text">{entry.text}</span>
              </div>
            );
          } else if (entry.type === 'response') {
            return (
              <div key={index} className="terminal-response">
                {entry.text.split('\n').map((line, idx) => (
                  <div key={idx} className="response-line">
                    {line}
                  </div>
                ))}
              </div>
            );
          }

          return null;
        })}

        {/* Display Error Messages */}
        {error && (
          <Typography color="error" variant="body1">
            {error}
          </Typography>
        )}
      </div>

      {/* Command Input at the bottom */}
      <form onSubmit={handleSubmit} className="terminal-input-area">
        <span className="terminal-prompt">user@cv:~$</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="terminal-input"
          autoFocus
          autoComplete="off"
          spellCheck="false"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </form>
    </div>
  );
}

export default Terminal;
