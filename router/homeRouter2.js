const path = require('path')
const bodyParser = require('body-parser')
const express = require('express')

const { query } = require('../utils/mysql/mysqlPromise')

// MySql



// 中间件
const router = express.Router()
router.use(bodyParser.urlencoded({extended: false}))

// 路由处理
/**
 * /home/base路由
 * 参数: sid=xxx & time=2020-1-1(可省略, 则为总共的)
*/
router.get('/base', async (req, response) => {
  const sid = Number(req.query.sid)
  try {
    let totalOrderPromise =  query(`select count(*) as count from shop_order where sid=${sid}`)
    let nowOrderPromise = query(`select count(*) as count from shop_order where sid=${sid} and day(time)=day(curdate())`)

    // 预收入
    let monthIncomePromise = query(`select sum(price) as monthprice from shop_order where sid=${sid} and month(time)=month(curdate())`)
    let nowIncomePromise = query(`select price from shop_order where sid=${sid} and day(time)=day(curdate())`)

    // 点赞数
    let totalLikePromise = query(`select sum(likenum) as total from shop_like where sid=${sid}`)
    let nowLikePromise = query(`select likenum from shop_like where sid=${sid} and day(time)=day(curdate())`)

    // 浏览量
    let totalBrowserPromise = query(`select sum(num) as total from shop_browser where sid=${sid}`)
    let nowBrowserPromise = query(`select num from shop_browser where sid=${sid} and date(time)=date(curdate())`)

    let values = await Promise.all([
      totalOrderPromise, nowOrderPromise,
      monthIncomePromise, nowIncomePromise,
      totalLikePromise, nowLikePromise,
      totalBrowserPromise, nowBrowserPromise
    ])
    
    // 订单量 0 1
    let totalOrderNum = 0
    let nowOrderNum = 0
    if (values[0].result.length > 0) {
      totalOrderNum = values[0].result[0].count
    }
    if (values[1].result.length > 0) {
      nowOrderNum = values[1].result[0].count
    }

    // 收入 2 3
    let monthIncome = 0
    let nowIncome = 0
    if (values[2].result.length > 0) {
      monthIncome = values[2].result[0].monthprice
    }
    if (values[3].result.length > 0) {
      nowIncome = values[3].result[0].price
    }

    // 点赞量 4 5
    let totalLikeNum=0, nowLikeNum=0
    if (values[4].result.length > 0) {
      totalLikeNum = values[4].result[0].total
    }
    if (values[5].result.length > 0) {
      nowLikeNum = values[4].result[0].likenum
    }

    // 浏览量 6 7
    let totalBrowserNum=0, nowBrowserNum=0
    if (values[6].result.length > 0) {
      totalBrowserNum = values[6].result[0].total
    }
    if (values[7].result.length > 0) {
      nowBrowserNum = values[7].result[0].num
    }

    response.send({ nowBrowserNum, totalBrowserNum, nowLikeNum, totalLikeNum, nowIncome, monthIncome, nowOrderNum, totalOrderNum })
  } catch(err) {
    // 将出入 写入日志
    console.log(err)
    response.statusCode = 400
    response.statusMessage = 'database query error'
  }  
})


/**
 * /home/order
 * 参数: sid
 * 实时订单 - 手动刷新|实时刷新只要有人买了,就刷新
 * 概括: 只要离当前时间最近的 两条记录
*/
router.get('/order', async (req, response) => {
  const sid = Number(req.query.sid)

  let { results } = await query(`select time, uname, mname from shop_order where sid=${sid} order by time desc limit 2`)

  // 时间需要转换一下
  let res = results.map(item => {
    let time = new Date(item.time).toLocaleString('chinese', { hour12: false }).replace(/\//g, '-')
    return { time, uname: item.uname, mname: item.mname }
  })

  response.send(res)  
})

/**
 * /home/income?sid=xxx
 * 参数: sid=xxx
 * 预收入 - 图表
*/
router.get('/income', async (req, response) => {
  let sid = Number(req.query.sid)

  let { results } = await query(`select sum(price) as dayprice,date(time) as daytime from shop_order where sid=${sid} group by date(time) order by daytime asc`)
  let res = results.map( item => {
    let daytime = new Date(item.daytime).toLocaleDateString('chinese', { hour12: false })
    daytime = daytime.replace(/\//g, '-')

    return {daytime, dayprice: item.dayprice}
  })
  response.send(res)
})

/**
 * /home/top?sid=xxx
 * 参数: sid=xxx
 * 本店 预定Top榜
*/
router.get('/top', async (req, response) => {
  let sid = Number(req.query.sid)
  
  try {
    let value = await query(`select mname, count(*) as reservenum from shop_order where sid=${sid} group by mname order by reservenum desc limit 5`)
    response.send(value.results)
  } catch(err) {
    console.log(err)
    response.statusCode = 400
    response.statusMessage = 'database query error'
  }
})


module.exports = router