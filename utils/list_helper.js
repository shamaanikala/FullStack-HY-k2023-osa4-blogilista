const dummy = (blogs) => {
    return 1
}


const totalLikes = (blogs) => {
    const result = blogs.reduce((like_sum,blogi) => like_sum + blogi.likes,0)
    return result
}

module.exports = {
    dummy,
    totalLikes
}