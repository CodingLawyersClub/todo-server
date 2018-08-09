var mongoose = require('mongoose');
var router = require('express').Router();
var ToDo = mongoose.model('ToDo');
var User = mongoose.model('User');
var auth = require('../auth');

router.post('/', auth.required, async (req, res, next) => {
    try {
        const todoFromRequest = req.body;        
        const { text } = todoFromRequest;
        const user = await User.findById(req.payload.id);
        const toDo = new ToDo({user, text});
        const savedToDo = await toDo.save();
        return res.json({toDo: savedToDo.toJSON()})
    } catch (e) {
        console.error(e);
        next(e);
    }
});

router.get('/', auth.required, async (req, res, next) => {
    try {
        const user = await User.findById(req.payload.id);
        const toDos = await ToDo.find({user}).sort({ createdAt: 'descending' });;
        return res.json({toDos: toDos.map((toDo) => toDo.toJSON(toDo))});
    } catch (e) {
        console.error(e);
        next(e);
    }
});
  
module.exports = router;
