const express = require("express");
var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
require("dotenv").config();
var PORT = process.env.PORT || 3030;
var open = require("open");

var path = require("path");

// Allows us to parse request bodies
app.use(express.json());

// Define where our static assets are
app.use(express.static("../Client"));

// Start app on port
http.listen(PORT, function() {
  console.log(`Listening on port ${PORT}`);

  // Opens the app after starting
  open(`http://localhost:${PORT}/login`);
});

// Routing
app.get("/main", (req, res) => {
  // Retrieve the username from the form
  const userName = req.query.userName;
  // Attach it as a payload
  res.sendfile(path.join(__dirname + "/../Client/main/main.html"), {
    username: userName
  });
});

app.get("/login", (req, res) => {
  res.sendfile(path.join(__dirname + "/../Client/login/login.html"));
});

// Active users
let activeUsers = {};

// Available rooms
let rooms = ["General", "Web-Dev"];

io.sockets.on("connection", socket => {
  // Listens for when a user sends a message
  socket.on("sendchat", msg => {
    // Updates the chat to show the message and message sender
    io.sockets.in(socket.room).emit("updatechat", socket.username, msg);
  });

  // Listens for when a user joins
  socket.on("adduser", username => {
    const defaultRoom = rooms[0];
    // Set user's username value
    socket.username = username;
    // Add user to the default room
    socket.join(defaultRoom);
    // Set user's room value
    socket.room = defaultRoom;
    // Add user to list of active users
    activeUsers[username] = username;

    // Notify the user they joined the default room
    socket.emit("updatechat", "SERVER", `you have connected to ${defaultRoom}`);
    // Notify everyone in the relevant room the user has joined
    socket.broadcast
      .to(defaultRoom)
      .emit(
        "updatechat",
        "SERVER",
        `${username} has connected to ${defaultRoom}`
      );
    // Update the list of active users
    io.sockets.emit("updateusers", activeUsers);
    // Update the list of rooms
    socket.emit("updaterooms", rooms, defaultRoom);
  });

  socket.on("switchRoom", newRoom => {
    // Remove user from current room
    socket.leave(socket.room);
    // Add the user to the new room
    socket.join(newRoom);
    // Set user's room value
    socket.room = newRoom;
    // Notify the user they joined the a new room
    socket.emit("updatechat", "SERVER", `you have connected to ${newRoom}`);
    // Notify everyone in the relevant room the user has joined
    socket.broadcast
      .to(newRoom)
      .emit(
        "updatechat",
        "SERVER",
        `${socket.username} has connected to ${newRoom}`
      );
    // Update the list of rooms
    socket.emit("updaterooms", rooms, newRoom);
  });

  socket.on("disconnect", () => {
    // Disconnect is emitted multiple times when a user leaves
    // so check to make sure it wasn't a false alarm
    if (socket.userName != undefined) {
      // Delete the user from the list of active users
      delete activeUsers[socket.username];
      // Remove the user from current room
      socket.leave(socket.room);
      // Update the list of active users
      io.sockets.emit("updateusers", activeUsers);
      // Notify everyone the user has disconnected
      socket.broadcast.emit(
        "updatechat",
        "SERVER",
        `${socket.username} has disconnected`
      );
    }
  });
});
