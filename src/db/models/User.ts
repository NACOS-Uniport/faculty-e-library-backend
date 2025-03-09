import {Schema, model, Document} from 'mongoose'

export interface IUser extends Document {
  email: string, password: string
}

const userSchema = new Schema<IUser>({
  email: {type: String, required: true},
  password: {type: String},
})

const userModel = model("User", userSchema)

export default userModel
