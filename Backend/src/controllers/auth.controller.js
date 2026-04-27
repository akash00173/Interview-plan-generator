const userModel = require("../models/user.model")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const blacklistModel = require("../models/blacklist.model")


async function registerUserController(req, res) {
  const {username, email, password} = req.body

  if (!username || !email || !password) {
    return res.status(400).json({message: "All fields are required"})
  }

  const isUserAlreadyExists = await userModel.findOne({$or: [{username}, {email}]})

  if (isUserAlreadyExists) {
    return res.status(400).json({message: "Username or Email already exists"})
  }
  const hash = await bcrypt.hash(password, 10)

  const user = await userModel.create({username, email, password: hash})

  const token = jwt.sign({id: user._id, username: user.username}, process.env.JWT_SECRET, {expiresIn: "1d"})

  res.json({message: "User registered successfully", token, user: {id: user._id, username: user.username, email: user.email}})

}

async function loginUserController(req, res) {
  const {email, password} = req.body

  const user = await userModel.findOne({email})

  if (!user) {
    return res.status(400).json({message: "Invalid email or password"})
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    return res.status(400).json({message: "Invalid email or password"})
  }

  const token = jwt.sign({id: user._id, username: user.username}, process.env.JWT_SECRET, {expiresIn: "1d"})

  res.json({message: "User logged in successfully", token, user: {id: user._id, username: user.username, email: user.email}})
}

async function logoutUserController(req, res) {
  const token = req.headers.authorization?.split(" ")[1]
  if(token){
    await blacklistModel.create({token})
  }
  res.json({message: "User logged out successfully"})
}

async function getMeController(req, res) {
  const user = await userModel.findById(req.user.id)
  res.json({message: "User details fetched successfully", user: {id: user._id, username: user.username, email: user.email}})
}

module.exports = {registerUserController, loginUserController, logoutUserController, getMeController};