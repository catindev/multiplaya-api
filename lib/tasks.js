const Task = require("./models/task");

module.exports.create = function create(data) {
    const newTask = new Task(data);
    return newTask.save()
        .then(task => task)
        .catch(error => { throw error });
}

module.exports.remove = function remove(taskID) {
    return Task.remove({ _id: taskID })
        .then(task => task)
        .catch(error => { throw error });
}

module.exports.find = function find() {
    return Task.find({}, {}).limit(4).sort({ "created": 1 })
        .then(tasks => tasks)
        .catch(error => { throw error });
}

