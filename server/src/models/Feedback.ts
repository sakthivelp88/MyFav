import { model, Schema, type InferSchemaType } from 'mongoose'

const feedbackSchema = new Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'resolved'],
      default: 'new',
    },
  },
  { timestamps: true }
)

export type Feedback = InferSchemaType<typeof feedbackSchema>

const FeedbackModel = model('Feedback', feedbackSchema)

export default FeedbackModel
