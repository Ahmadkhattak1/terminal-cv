// src/components/Admin.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Box,
  Divider,
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { db, auth, analytics } from '../firebaseConfig';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';

function Admin() {
  const [commands, setCommands] = useState([]);
  const [newCommand, setNewCommand] = useState({
    name: '',
    description: '',
    response: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    activeVisitors: 0,
    uniqueVisitors: 0,
    geographicLocations: {},
    mostUsedCommands: [],
  });
  const [error, setError] = useState(null); // State for error messages
  const navigate = useNavigate();
  const [user, loadingAuth, errorAuth] = useAuthState(auth);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loadingAuth && !user) {
      navigate('/login'); // Adjust the route as per your routing setup
    }
  }, [user, loadingAuth, navigate]);

  // Fetch commands from Firestore on component mount
  useEffect(() => {
    const fetchCommands = async () => {
      try {
        const cmdCollection = collection(db, 'commands');
        const q = query(cmdCollection, orderBy('createdAt', 'asc')); // Removed the where clause
        const cmdSnapshot = await getDocs(q);
        const cmds = cmdSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCommands(cmds);
        console.log('Fetched commands:', cmds); // Debugging
      } catch (error) {
        console.error('Error fetching commands:', error);
        setError(`Error fetching commands: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommands();
  }, []); // Removed [db] from dependencies

  // Fetch analytics data from Firestore
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const analyticsCollection = collection(db, 'analytics');
        const analyticsSnapshot = await getDocs(analyticsCollection);
        const visitorsSet = new Set();
        const geographicCount = {};
        const commandUsage = {};

        const currentTime = Date.now();
        const activeThreshold = 5 * 60 * 1000; // 5 minutes

        analyticsSnapshot.forEach((doc) => {
          const data = doc.data();

          // Track unique visitors
          if (data.visitorId) {
            visitorsSet.add(data.visitorId);
          }

          // Track active visitors
          if (data.lastActive && currentTime - data.lastActive < activeThreshold) {
            visitorsSet.add(data.visitorId);
          }

          // Track geographic locations
          if (data.location && data.location.country) {
            const country = data.location.country;
            geographicCount[country] = (geographicCount[country] || 0) + 1;
          }

          // Track most used commands
          if (data.commandName) {
            const cmdName = data.commandName.toLowerCase();
            commandUsage[cmdName] = (commandUsage[cmdName] || 0) + 1;
          }
        });

        // Determine most used commands
        const sortedCommands = Object.entries(commandUsage)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([command, count]) => ({ command, count }));

        setAnalyticsData({
          activeVisitors: visitorsSet.size,
          uniqueVisitors: visitorsSet.size, // Adjust if unique visitors differ
          geographicLocations: geographicCount,
          mostUsedCommands: sortedCommands,
        });
      } catch (error) {
        console.error('Error fetching analytics:', error);
        alert(`Error fetching analytics: ${error.message}`);
      }
    };

    fetchAnalytics();
  }, []);

  // Handle adding a new command
  const handleAddCommand = async (e) => {
    e.preventDefault();
    const { name, description, response } = newCommand;

    if (!name.trim() || !description.trim()) {
      setError('Command name and description are required.');
      return;
    }

    try {
      const cmdCollection = collection(db, 'commands');
      await addDoc(cmdCollection, {
        name: name.trim(),
        description: description.trim(),
        response: response.trim(),
        createdAt: serverTimestamp(), // Add createdAt timestamp
      });
      setNewCommand({ name: '', description: '', response: '' });
      alert('Command added successfully!');

      if (analytics) {
        logEvent(analytics, 'command_added', { command: name.trim() });
      }

      // Refresh the command list
      const cmdSnapshot = await getDocs(query(cmdCollection, orderBy('createdAt', 'asc')));
      const cmds = cmdSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCommands(cmds);
    } catch (error) {
      console.error('Error adding command:', error);
      setError(`Failed to add command: ${error.message}`);
    }
  };

  // Handle deleting a command
  const handleDeleteCommand = async (id, name) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the command '${name}'?`
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'commands', id));
      setCommands(commands.filter((cmd) => cmd.id !== id));
      alert('Command deleted successfully!');

      if (analytics) {
        logEvent(analytics, 'command_deleted', { command: name });
      }
    } catch (error) {
      console.error('Error deleting command:', error);
      setError(`Failed to delete command: ${error.message}`);
    }
  };

  // Handle logout
  const handleLogout = () => {
    auth.signOut();
    navigate('/');
  };

  // Prepare data for charts
  const geographicData = Object.entries(analyticsData.geographicLocations).map(
    ([country, count]) => ({
      name: country,
      value: count,
    })
  );

  const commandsData = analyticsData.mostUsedCommands.map(
    ({ command, count }) => ({
      name: command,
      value: count,
    })
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1" color="primary">
          Admin Dashboard
        </Typography>
        <Button variant="contained" color="secondary" onClick={handleLogout}>
          Logout
        </Button>
      </Box>

      {/* Display Error Messages */}
      {error && (
        <Typography color="error" variant="body1" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Add New Command Form */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Add New Command
        </Typography>
        <Box component="form" onSubmit={handleAddCommand} noValidate>
          <TextField
            label="Command Name"
            variant="outlined"
            fullWidth
            required
            value={newCommand.name}
            onChange={(e) => setNewCommand({ ...newCommand, name: e.target.value })}
            margin="normal"
          />
          <TextField
            label="Description"
            variant="outlined"
            fullWidth
            required
            value={newCommand.description}
            onChange={(e) => setNewCommand({ ...newCommand, description: e.target.value })}
            margin="normal"
          />
          <TextField
            label="Response"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            value={newCommand.response}
            onChange={(e) => setNewCommand({ ...newCommand, response: e.target.value })}
            margin="normal"
          />
          <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
            Add Command
          </Button>
        </Box>
      </Paper>

      {/* Existing Commands List */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" gutterBottom>
          Existing Commands
        </Typography>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height={200}>
            <CircularProgress />
          </Box>
        ) : commands.length === 0 ? (
          <Typography variant="body1">No commands available.</Typography>
        ) : (
          <List>
            {commands.map((cmd) => (
              <React.Fragment key={cmd.id}>
                <ListItem
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteCommand(cmd.id, cmd.name)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={<Typography variant="subtitle1">{cmd.name || 'Unnamed Command'}</Typography>}
                    secondary={cmd.description}
                  />
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Analytics Section */}
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Analytics
        </Typography>
        <Grid container spacing={4}>
          {/* Active Visitors */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, backgroundColor: '#e3f2fd' }}>
              <Typography variant="h6">Current Active Visitors</Typography>
              <Typography variant="h4" color="primary">
                {analyticsData.activeVisitors}
              </Typography>
            </Paper>
          </Grid>

          {/* Unique Visitors */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2, backgroundColor: '#fce4ec' }}>
              <Typography variant="h6">Total Unique Visitors</Typography>
              <Typography variant="h4" color="secondary">
                {analyticsData.uniqueVisitors}
              </Typography>
            </Paper>
          </Grid>

          {/* Geographic Locations */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Geographic Locations
              </Typography>
              {geographicData.length === 0 ? (
                <Typography variant="body2">No data available.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      dataKey="value"
                      isAnimationActive={false}
                      data={geographicData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>

          {/* Most Used Commands */}
          <Grid item xs={12} md={6}>
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Most Used Commands
              </Typography>
              {commandsData.length === 0 ? (
                <Typography variant="body2">No data available.</Typography>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={commandsData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#82ca9d" name="Usage Count" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
}

export default Admin;
