const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        default: 'guest_user_1' // We will hardcode this until we build an auth system
    },
    logType: {
        type: String,
        enum: ['nutrition', 'biomechanics'],
        required: true
    },
    // Data specific to the YOLOv8 Nutrition Scanner
    nutritionData: {
        detectedItems: [String],
        totalCalories: Number,
        totalProtein: Number,
        totalCarbs: Number,
        totalFats: Number,
        imageUrl: String
    },
    // Data specific to the MediaPipe Form Analyzer
    biomechanicsData: {
        exerciseType: String,
        repsCounted: Number,
        averageAngle: Number,
        formErrorsDetected: [String],
        videoUrl: String
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', LogSchema);