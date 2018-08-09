const mongoose = require('mongoose');

let ToDoSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, required: true }
}, {timestamps: true});

ToDoSchema.methods.toJSON = function(){
    return {
        id: this.id,
        text: this.text
    }
}

mongoose.model('ToDo', ToDoSchema);
