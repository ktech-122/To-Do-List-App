if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require("express");
const app = express()
const path = require('path')
const mongoose = require('mongoose');
const methodOverride = require('method-override')
const flash = require('connect-flash')
const session = require('express-session');
const Todo = require('./models/todo');
const bcrypt = require('bcrypt');
const User = require('./models/user');
const MongoStore = require("connect-mongo");
const dbUrl = process.env.DB_URL
// 'mongodb://127.0.0.1:27017/toDoApp'

mongoose.set('strictQuery', true);
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MONGO CONNECTION OPEN!!!")
}).catch(err => {
    console.log("OH NO MONGO CONNECTION Error!!")
    console.log(err)
})

const store = MongoStore.create({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: process.env.SECRET
    }
});

store.on("error", (err) => {
    console.log("SESSION STORE ERROR: " + err)
})

const secret = process.env.SESSION_SECRET

const sessionOptions = { store, secret, resave: false, saveUninitialized: true };

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(session(sessionOptions));
app.use(methodOverride('_method'));
app.use(flash());


app.use((req, res, next) => {
    res.locals.messages = [req.flash('success'), ...req.flash('delete')];
    next();
})





const requireLogin = (req, res, next) => {
    if (req.session.user_id) {
        next();
    } else {
        res.send('Not logged in')
    }
}



app.get('/register', (req, res) => {
    res.render('register')
})

app.get('/todo', requireLogin, async (req, res, next) => {
    try {
        const todos = await Todo.find({ user: req.session.user_id })
        res.render('todo', { todos })
    } catch (err) {
        next(err)
    }
})

app.get('/todo/new', requireLogin, (req, res) => {
    res.render('newTodo')
})

app.get('/todo/:id', requireLogin, async (req, res) => {
    const { id } = req.params;
    console.log("Requested game ID:", id);
    try {
        const todoInfo = await Todo.findOne({ _id: id })

        if (!todoInfo) {
            throw new Error("Todo not found")
        }
        res.render('show', { todoInfo })
    } catch (err) {
        res.status(404).send("Todo not found")
    }

})



app.get('/todo/:id/edit', requireLogin, async (req, res) => {
    const { id } = req.params;
    try {
        const todo = await Todo.findOne({ _id: id })

        if (!todo) {
            throw new error('Todo not found')
        }
        res.render('edit', { todo: todo })
    } catch (err) {
        res.status(404).send("Todo not found")
    }
});

app.get('/login', (req, res) => {
    res.render('login')
})

app.delete('/todo/:id', requireLogin, async (req, res) => {
    const { id } = req.params
    try {
        const todo = await Todo.findOneAndDelete({ _id: id })
        console.log('Todo Deleted:', todo)
        req.flash('delete', 'Todo deleted')
        res.redirect('/todo')
    } catch (err) {
        res.status(500).send('Error Deleting To-Do: ' + err.message)
    }
})

app.post('/todo', requireLogin, async (req, res) => {
    const { title, description, dueDate } = req.body;
    const userId = req.session.user_id;

    const newTodo = new Todo({
        title: title,
        description: description,
        dueDate: dueDate,
        user: userId,
        completed: false
    })

    try {
        await newTodo.save();
        console.log('New Todo saved:', newTodo);
        req.flash('success', 'Todo Saved');
        res.redirect('/todo');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating a new todo');
    }
})

app.post('/todo/:id/complete', requireLogin, async (req, res) => {
    const { id } = req.params
    try {
        const todo = await Todo.findOne({ _id: id });
        if (!todo) {
            throw new Error('Todo not found)');
        }
        todo.completed = true;
        await todo.save();
        res.redirect('/todo');
    } catch (err) {
        res.status(404).send(err.message);
    }
})

app.post('/todo/:id/incomplete', requireLogin, async (req, res) => {
    const { id } = req.params
    try {
        const todo = await Todo.findOne({ _id: id });
        if (!todo) {
            throw new Error('Todo not found)');
        }
        todo.completed = false;
        await todo.save();
        res.redirect('/todo');
    } catch (err) {
        res.status(404).send(err.message);
    }
})

app.post('/todo/:id/edit', requireLogin, async (req, res) => {
    const { title, description, dueDate, completed } = req.body;
    const { id } = req.params;
    try {
        const todo = await Todo.findById(id);
        if (!todo) {
            throw new Error('Todo not found')
        }

        todo.title = title;
        todo.description = description;
        todo.dueDate = dueDate
        todo.completed = completed

        await todo.save();
        res.redirect('/todo');
    } catch (err) {
        res.status(404).send(err.message);
    }
})


app.post('/register', async (req, res) => {
    const { username, password } = req.body
    const hash = await bcrypt.hash(password, 12)

    const newUser = new User({
        username: username,
        password: hash
    })
    await newUser.save()
    req.session.user_id = newUser._id;
    res.redirect('/todo');
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const foundUser = await User.findAndValidate(username, password);

    if (foundUser) {
        req.session.user_id = foundUser._id;
        res.redirect('/todo')
    } else {
        res.status(400).send('Invalid Login,Please Try Again')
    }

})

app.post('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/login')
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log('To-list is now Running at port ' + PORT)
})