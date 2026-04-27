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

  res.cookie("token", token)

  res.status(201).json({message: "User registered successfully", user: {id: user._id, username: user.username, email: user.email}})

}

async function loginUserController(req, res) {
  const {email, password} = req.body

  console.log("Login attempt:", email)

  const user = await userModel.findOne({email})

  if (!user) {
    console.log("User not found:", email)
    return res.status(400).json({message: "Invalid email or password"})
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)

  if (!isPasswordValid) {
    console.log("Invalid password for:", email)
    return res.status(400).json({message: "Invalid email or password"})
  }

  const token = jwt.sign({id: user._id, username: user.username}, process.env.JWT_SECRET, {expiresIn: "1d"})

  console.log("Login success, setting cookie for:", email)
  res.cookie("token", token)

  res.status(200).json({message: "User logged in successfully", user: {id: user._id, username: user.username, email: user.email}})
}

async function logoutUserController(req, res) {
  const token = req.cookies.token

  if(token){
    await blacklistModel.create({token})
  }

  res.clearCookie("token")

  res.status(200).json({message: "User logged out successfully"})
}

async function getMeController(req, res) {

  const user = await userModel.findById(req.user.id)

  res.status(200).json({message: "User details fetched successfully", user: {id: user._id, username: user.username, email: user.email}})
}
module.exports = {registerUserController, loginUserController, logoutUserController, getMeController};