const fs = require('fs')
const { generate } = require('./dashboard/generate-html')
const { publish } = require('./publisher/here')

// 读取数据
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'))

// 生成 HTML
const html = generate(data)
console.log('生成HTML成功')

// 发布到 here.now
publish(html).then(() => {
  console.log('发布完成')
}).catch(err => {
  console.error('发布失败:', err)
})