const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')

const jwt = require('jsonwebtoken')
const { requestLogger, userExtractor } = require('../utils/middleware')
const logger = require('../utils/logger')


blogsRouter.get('/', async (request, response) => {
    const blogs = await Blog.find({}).populate('user', { username: 1, name: 1 })
    response.json(blogs)
})

blogsRouter.post('/', userExtractor, async (request, response) => {
    const body = request.body
    const user = request.user

    const blog = new Blog({
        title: body.title,
        author: body.author,
        url: body.url,
        likes: body.likes,
        user: user._id
    })

    const savedBLog = await blog.save()
    user.blogs = user.blogs.concat(savedBLog._id)
    await user.save()

    response.status(201).json(savedBLog)
})

blogsRouter.delete('/:id', userExtractor, async (request, response) => {
    const blogId = request.params.id
    const blogToDelete = await Blog.findById(blogId)

    // jos yritetään deletoida olemattomalla id:llä
    // Palautetan tällöin statuskoodi 404 vaikka kurssimateriaali ei tästä mainitse:
    // esim StackOverflow:
    // https://stackoverflow.com/questions/6439416/status-code-when-deleting-a-resource-using-http-delete-for-the-second-time?noredirect=1&lq=1
    // https://stackoverflow.com/questions/42865965/what-should-be-the-response-of-get-and-delete-methods-in-rest?noredirect=1&lq=1
    // https://stackoverflow.com/questions/2342579/http-status-code-for-update-and-delete
    if (!blogToDelete) {
        //console.log('Id:llä ei löydy tietokannasta blogia')
        logger.info(`(blogsRouter: delete): ${Date()}`)
        logger.info(`DELETE request done with nonexisting id: ${blogId}`)
        return response.status(404).end()
    }

    // blogin luoneen käyttäjän tieto on tietokannassa muodossa:
    // user: new ObjectId("6436a10e40980f329f08b00e")

    // jos jostain syystä tietokannasta löytyy blogi ilman
    // user kenttää, heittää palvelin tässä kohtaa silloin 500

    const deleter = request.user
    const deleterId = deleter.id
    
    if (!blogToDelete.user) {
        logger.info(`(blogsRouter: delete): ${Date()}`)
        logger.info(`DELETE request to a blog without 'user' field`)
        logger.info(`- Blog: ${blogToDelete}`)
        logger.info(`- User from token: ${deleterId}`)
        return response.status(500).json({ error: `Unable to finish the DELETE operation: missing user information` })
    }
    const blogToDeleteCreator = blogToDelete.user.toString()
    
    if (blogToDeleteCreator !== deleterId) {
        //console.log('Tokenin käyttäjällä ei ole oikeutta deletoida blogia')
        logger.info(`(blogsRouter: delete): ${Date()}`)
        logger.info(`Unauthorized DELETE`)
        logger.info(`- from userId ${deleterId}`)
        logger.info(`- to blogId ${blogId} by userId ${blogToDeleteCreator}`)
        return response.status(401).json({ error: 'UserId wrong, cannot delete blog' })
    }

    await Blog.findByIdAndRemove(request.params.id)
    response.status(204).end()
})

blogsRouter.put('/:id', async (request, response) => {
    const body = request.body
    const { title, author, url, likes } = request.body

    // tälle annetaan javascript-olio eikä Blog-olio
    // new parametri palauttaa muuttuneen olion kutsujalle
    //const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true })
    const updatedBlog = await Blog.findByIdAndUpdate(
        request.params.id,
        {title, author, url, likes},
        { new: true, runValidators: true, context: 'query' })
    response.status(200).json(updatedBlog)
})

module.exports = blogsRouter