import React, { Component } from 'react'
import { Fabric } from 'office-ui-fabric-react/lib/Fabric'
import { DefaultButton } from 'office-ui-fabric-react/lib/Button'
import { hot } from 'react-hot-loader'
import { Pivot, PivotItem } from 'office-ui-fabric-react/lib/Pivot'
import { List } from 'office-ui-fabric-react/lib/List'
import MessageBar from '@/components/common/MessageBar'
import AppFormItem from '@/components/common/AppFormItem'
import {Treebeard, decorators} from 'react-treebeard'
import treeStyle from '@/config/treeStyle'
import { SearchBox } from 'office-ui-fabric-react/lib/SearchBox'

let temp = null
const data = {
  name: 'root',
  toggled: true,
  children: [
    {
      name: 'parent',
      children: [
        { name: 'child1' },
        { name: 'child2' }
      ]
    },
    {
      name: 'loading parent',
      loading: true,
      children: []
    },
    {
      name: 'parent',
      children: [
        {
          name: 'nested parent',
          children: [
            { name: 'nested child 1' },
            { name: 'nested child 2' }
          ]
        }
      ]
    }
  ]
};

class App extends Component {
  constructor (props) {
    super(props)
    this.state = {
      errorList: [],
      ambiguousList: [],
      examinationFlag: false,
      detail: null,
      modelListFlag: false,
      modelList: [
        {name: '模板1', tags: ['标签1']},
        {name: '模板2', tags: ['标签2']},
        {name: '模板3', tags: ['标签3', '标签4']}
      ]
    }

    this.messageBar = React.createRef()
  }

  // 从word提取章节 同时检测当前章节情况是否符合预期
  async getSections (context) {
    const sections = context.document.sections
    context.load(sections, 'body')  
    await context.sync()
    return new Promise((resolve) => {
      if (sections.items.length === 3) {
        resolve(sections)
      } else {
        this.Message({type: 'warning', message: '请确认当前文档已分为三个章节'})
      }
    })
  }

  // 从word中提取内容对象数组
  async getParArr (context) { 
    const mySections = await this.getSections(context)
    const paragraphs = mySections.items[1].body.paragraphs
    context.load(paragraphs, 'text')
    await context.sync()

    const arr = paragraphs.items.map(item => item.text)
    let newArr = []

    arr.filter(item => {
      if (item === '') return false
      const reg = /^(\s)+$/
      return !reg.test(item)
    }).forEach(item => {
      const reg = /^(\s*([0-9]+)(?:\.|、))/
      if (reg.test(item) || newArr.length === 0) {
        newArr.push([item])
      } else {
        const index = newArr.length - 1
        newArr[index].push(item)
      }
    })

    const reg1 = /^(\s*([0-9]+)(?:\.|、))/
    const reg2 = /所述的(.+?)，其特征在于/ 
    const reg3 = /一种(.+?)，其特征在于/
    const reg4 = /(如权利要求(.+?)所述)/
    const reg5 = /[0-9]+/g

    const errorList = [] // 提取数据数组时 不符合格式段落的错误列表

    newArr = newArr.map((item, index) => {
      let root = false

      const match1 = item[0].match(reg1)
      if (!match1) {
        errorList.push(this.getErrorObj({first_text: item[0]}, 'first_text', '没有监测到编号'))
        return false
      }

      let number_str = match1[1]
      let number = match1[2] - 0

      let match2 = item[0].match(reg2)
      if (!match2) {
        match2 = item[0].match(reg3)
        if(!match2) {
          errorList.push(this.getErrorObj({first_text: item[0]}, 'first_text', '没有监测到相应关键字，应为“一种...，其特征在于”或“所述的...，其特征在于”'))
          return false
        } else {
          root = true
        }
      }
      let subject = match2[1]

      const match3 = item[0].match(reg4) 
      let import_str = ''
      let import_arr = []
      if (match3) {
        import_str = match3[1]
        import_arr = match3[2].match(reg5).map(item => item - 0)
      }
      
      return {
        text: item.join(''),
        first_text: item[0],
        text_arr: item,
        number,
        number_str,
        subject,
        root,
        import_str,
        import_arr
      }
    })

    return new Promise((resolve, reject) => {
      if (newArr.length !== 0 && errorList.length === 0) {
        resolve(newArr)
      } else {
        if (newArr.length === 0) {
          this.Message({type: 'warning', message: '权利要求部分不能为空'})
        } else if (errorList.length !== 0) {
          this.Message({type: 'warning', message: '权利要求部分格式不匹配'})
          reject(errorList)
        } else {
          this.Message({type: 'warning', message: '程序异常'})
        }
      }
    })   
  }

  // 查询段落附属文本
  // @params context[obj](上下文) arr[array](带查询对象数组) key[string](附属关键字)
  async searchText (context, arr, key) {

    const rootBody = context.document.body
    
    // 查询段落
    let temp = arr.map(item => {
      const searchResults = rootBody.search(item['text_arr'][0])
      searchResults.temp = item[key]
      context.load(searchResults, 'text')
      return searchResults
    })

    await context.sync()

    // 查询段落中的附属部分
    temp = temp.map(results => {
      const inResults = results.items[0].search(results.temp)
      return inResults
    })

    return temp
  }

  changeFont (font) {
    font.highlightColor = 'yellow'
  }

  // 高亮标注文本 
  // @params context[obj](上下文) arr[array](错误对象数组) key[string](标注关键字)
  async markText (context, arr, key) {
    
    const temp = await this.searchText(context, arr, key)
    temp.forEach(item => {
      context.load(item, 'font')
    })

    await context.sync()

    // 高亮将错误标出
    temp.forEach(inResults => {
      this.changeFont(inResults.items[0].font)
    })
  }

  fillWord = () => {
    Word.run( async (context) => {
      // Queue a command to get the current selection and then 
      // create a proxy range object with the results.
      let newArr
      try {
        newArr = await this.getParArr(context)
      } catch (error) {
        console.log(error)
        return false
      }
      let obj = {
        'abstract': newArr[0].text.replace(/所述/g, '').replace(/其特征在于，/, '').replace(/^\s*[0-9]+(?:\.|、)\s*/, '本申请及'),
        'description': newArr.map((item, index) => {
          if (index === 0) {
            return item.text.replace(/^\s*[0-9]+(?:\.|、)\s*/, '本发明/实用新型提供').replace(/所述/g, '').replace(/其特征在于，/, '')
          } else {
            return item.text.replace(/^\s*[0-9].*?其特征在于/, '在一个实施例中')
          }
        })
      }

      let mySections = context.document.sections
      context.load(mySections, 'body')

      await context.sync()
      

      mySections.items[0].body.insertText(obj['abstract'], Word.InsertLocation.start)
      obj['description'].forEach(item => {
        mySections.items[2].body.insertParagraph(item, Word.InsertLocation.end)
      })

      this.Message({message: '填充成功', type: 'success'})

      // mySections.items[0].getHeader('firstPage').insertText('说明书摘要', Word.InsertLocation.end)
    })    
  }

  clearWord = () => {
    Word.run(async (context) => {
      context.document.body.clear()
      await context.sync()
      this.Message({message: '清空成功', type: 'success'})
    })
  }

  handleClickLeave = () => {

      window.location.href = 'login.html'
    
  }

  handleClickSave = () => {
    Word.run( async (context) => {
      const cache = context.document.body.getHtml()
      await context.sync()
      temp = cache.value
      console.log(temp)
      this.Message({message: '保存模板成功', type: 'success'})
    })
  }

  handleClickApply = () => {
    Word.run( async (context) => {
      if (temp !== null & temp !== '') {
        context.document.body.insertHtml(temp, Word.InsertLocation.start)
        await context.sync()
        this.Message({message: '应用模板成功', type: 'success'})
      }
    })
  }

  adjustNumber = () => {
    Word.run(async (context) => {
      let newArr
      try {
        newArr = await this.getParArr(context)
      } catch (errorList) {
        if (Array.isArray(errorList)) {
          this.setState({ambiguousList: errorList})
        }
        return false
      }

      const ambiguousList = []
      const ambiguousSet = new Set()
      const changeMap = new Map()
      
      // 编号唯一性处理
      newArr.forEach(item => {
        const number = item.number
        if (ambiguousSet.has(number)) {
          ambiguousList.push(this.getErrorObj(item, 'first_text', '编号不唯一'))
        } else {
          ambiguousSet.add(number)
        }
      })

      if (ambiguousList.length !== 0) {
        this.Message({type: 'warning', message: '编号不唯一'})
        this.setState({ambiguousList})
        return false
      }

      // 编号顺序处理
      newArr.forEach((item, index) => {
        const number = item.number
        if (number !== index + 1) {
          changeMap.set(number, index + 1)
          item.new_number_str = item.number_str.replace(number, index + 1)
        }
      })

      // 附属编号处理
      newArr.forEach((item, index) => {
        if (item.import_arr.length === 0) return false
        
        item.import_arr.forEach(number => {
          const newNum = changeMap.get(number)
          if (newNum) {
            item.new_import_str = (item.new_import_str ? item.new_import_str : item.import_str).replace(number, newNum)
          }
        })
        
      })

      // 待处理文本合并
      let replaceArr = []
      newArr.forEach(item => {
        if (item.new_number_str) {
          item.replace_text = item.first_text.replace(item.number_str, item.new_number_str)
        }

        if (item.new_import_str) {
          item.replace_text = item.replace_text ? item.replace_text : item.first_text
          item.replace_text = item.replace_text.replace(item.import_str, item.new_import_str)
        }

        if (item.replace_text) {
          replaceArr.push(item)
        }

      })

      // 获取查询结果数组
      await this.searchArrRange(context, replaceArr, 'first_text')
      
      // 替换文本
      replaceArr.forEach((item, index) => {
        item.body.items[0].insertText(item['replace_text'], Word.InsertLocation.replace)
      })

      await context.sync()
      this.setState({ambiguousList: []})
      this.Message({message: '编号自动调整成功', type: 'success'})
    })
  }

  handleExamination = () => {
    Word.run(async (context) => {
      let newArr
      try {
        newArr = await this.getParArr(context) 
      } catch (error) {
        if (Array.isArray) {
          this.setState({errorList: error})
        }
        return false
      }

      let errorArr = []

      // 编号顺序检查
      newArr.forEach((item, index) => {
        if (item.number !== index + 1) {
          errorArr.push(this.getErrorObj(item, 'number_str', '编号顺序不正确'))
        }
      })
      // 附属编号小于本身编号
      newArr.forEach(item => {
        if (item.import_arr.some(i => i >= item.number)) {
          errorArr.push(this.getErrorObj(item, 'import_str', '附属编号必须大于本身编号'))
        }
      })
      // 主题检查
      let tempSubject = ''
      newArr.forEach(item => {
        if (item.root) {
          tempSubject = item.subject
        } else {
          if (!(tempSubject === item.subject)) {
            errorArr.push(this.getErrorObj(item, 'subject', '主题词不一致'))
          }
        }
      })
      // 若第一阶段存在错误 则无法进行第二阶段校验
      if (errorArr.length !== 0) {
        this.setState({
          errorList: errorArr
        })
        this.Message({message: '存在编号错误，请修改完成后，再次校验', type: 'warning'})
      } else {
        const paraMap = new Map()
        newArr.forEach(item => {
          paraMap.set(item.number, item)
        })

        // 格式检查
        // newArr.forEach(item => {

        // })

        // 附属编号不可横跨主题词
        newArr.forEach(item => {
          if (!item.root) {
            const flag = item.import_arr.every(importNumber => paraMap.get(importNumber).subject === item.subject)
            if (!flag) {
              errorArr.push(this.getErrorObj(item, 'import_str', '附属编号不可横跨主题词'))
            }
          }
        })

        // 附属编号不能交叉
        let crossSet = new Set() // 不可引用集
        newArr.forEach(item => {
          if (!item.root) {
            item.import_arr.every(importNumber => {
              if (!crossSet.has(importNumber)) {

              }
            })
          }
        })

        // 多重引用权利要求不得再成为多重附属权利要求的引用基础
        const setSingle = new Set()   // 单一引用集
        newArr.forEach(item => {
          if (item.root) {
            setSingle.add(item.number)
          } else {
            const flag = item.import_arr.every(item => setSingle.has(item))

            if (item.import_arr.length === 1 && flag) {
              setSingle.add(item.number)
            }
            if (item.import_arr.length > 1 && !flag) {
              errorArr.push(this.getErrorObj(item, 'import_str', '多重引用权利要求不得再成为多重附属权利要求的引用基础'))
            }
          }
        })

        // 刷新列表
        if (!this.state.examinationFlag) {
          this.setState({examinationFlag: true})
        }
        this.setState({errorList: errorArr})
        if (errorArr.length !== 0) {
          this.Message({message: '检测到错误', type: 'warning'})  
        } else {
          this.Message({message: '未发现权利要求形式错误', type: 'success'})
        }

      }
    }) 
  }

  getErrorObj (item, errorKey, errorMessage) {
    return Object.assign({}, item, {errorKey, errorMessage})
  }
  // 校验当前文档是否单章节
  checkChapter () {
    return new Promise((resolve) => {
      Word.run(async (context) => {
        let sections = context.document.sections
        context.load(sections, 'body')
        await context.sync()
        if (sections.items.length === 1 || sections.items.length === 0) {
          resolve()
        } else {
          this.Message({type: 'warning', message: '当前文档已存在多个章节'})  
        }
      })
    })
  }
  // 添加章节
  fillChapter = async () => {
    await this.checkChapter()

    Word.run(async (context) => {

      context.document.body.insertBreak(Word.BreakType.next,  Word.InsertLocation.start)
      context.document.body.insertBreak(Word.BreakType.next,  Word.InsertLocation.start)
      let mySections = context.document.sections
      context.load(mySections, 'body/style')
      await context.sync()

      const arr = mySections.items.map(item => {
        const header = item.getHeader('firstPage')
        context.load(header, 'font')
        return header
      })
      await context.sync()

      arr.forEach(item => {
        item.font.name = '黑体'
        item.font.size = 18
      })     
      arr[0].insertText('说明书摘要', Word.InsertLocation.end)
      arr[1].insertText('权利要求书', Word.InsertLocation.end)
      arr[2].insertText('说明书', Word.InsertLocation.end)
    })
  }

  Message ({message, type}) {
    this.messageBar.current.message({message, type})
  }

  handleListClick (item) {
    Word.run(async (context) => {
      const range = await this.searchTextRange(context, item)
      range.select()
    })
  }

  handleLeave () {
    location.href = 'login.html'
  }

  async searchTextRange (context, item) {
    const mySections = await this.getSections(context)
    let range = mySections.items[1].body.search(item.first_text)
    context.load(range, 'body')
    await context.sync()
    range = range.items[0].search(item[item.errorKey])
    context.load(range, 'body')
    await context.sync()
    return range.items[0]
  }

  async searchArrRange (context, arr, key) {
    const mySections = await this.getSections(context)
    const rootBody = mySections.items[1].body 
    arr.forEach(item => {
      item.body = rootBody.search(item.first_text)
      context.load(item.body, 'body')
    })

    await context.sync()

    if (key === 'first_text') return arr

    arr.forEach(item => {
      item.body = item.body.items[0].search(item[key])
      context.load(item.body, 'body')
    })

    await context.sync()

    return arr
  }

  _onListCell = (item, index) => {
    return (
      <div className="ms-ListGhostingExample-itemCell" data-is-focusable={true} onClick={() => {this.handleListClick(item)}}>
        <div className="ms-ListGhostingExample-itemName" title={item.errorMessage}>{item.errorMessage}</div>
        <div className="ms-ListGhostingExample-itemIndex">{item.first_text}</div>        
      </div>
    )
  }

  _onModelListCell = (item, index) => {
    return (
      <div className="model-list-item">
        <span>{item.name}</span>
        {
          item.tags && item.tags.length !== 0
           ? item.tags.map((item, index) => (<span key={index} className="model-list-item-tag">{item}</span>))
           : ''
        }
      </div>
    )
  }

  onToggle = (node, toggled) => {
    if (this.state.cursor) {this.state.cursor.active = false;}
    node.active = true;
    if (node.children) { node.toggled = toggled; }
    this.setState({ 
      cursor: node,
      detail: {
        name: '',
        type: '',
        in_deadline: '',
        deadline: '',
        remarke: ''
      } 
    });
  }

  switchPanel = () => {
    this.setState({
      modelListFlag: true
    })
  }

  returnPanel = () => {
    this.setState({
      modelListFlag: false
    })
  }

  render() {

    const errorListData = this.state.errorList
    const modelListData = this.state.modelList
    const caseDetail = this.state.detail

    const errorList = this.state.examinationFlag && this.state.errorList.length === 0 
      ? (
        <div style={{marginTop: '15px'}}>暂未发现错误...</div>
      ) 
      : (
        <List items={errorListData} onRenderCell={this._onListCell}/>
      )
    const ambiguousList = this.state.ambiguousList
    const labelWidth = '80px'
    return (
      <Fabric>
        <div id="content-header">
          <div style={{paddingLeft: '15px'}}>
              <h1>欢迎使用</h1>
          </div>
        </div>    
        <div id="content-main">
          <Pivot>
            <PivotItem
              linkText="基础"
              className="padding"
            >  
              <p>Choose the buttons below to add boilerplate text to the document by using the Word JavaScript API.</p>
              <h3>试用</h3>
              <DefaultButton primary={true} onClick={this.fillChapter}>
                填充章节
              </DefaultButton>
              <br /><br />
              <DefaultButton primary={true} onClick={this.fillWord}>
                补全文档
              </DefaultButton>
              <br /><br />
              <DefaultButton primary={true} onClick={this.clearWord}>
                清空文档
              </DefaultButton>
              <br /><br />
              <DefaultButton primary={true} onClick={this.handleLeave}>
                返回登陆界面
              </DefaultButton>
            </PivotItem>
            <PivotItem linkText="编号" className="padding">
              <DefaultButton primary={true} onClick={this.adjustNumber} style={{width: '100%'}}>
                编号调整
              </DefaultButton>
              <List items={ambiguousList} onRenderCell={this._onListCell}/>
            </PivotItem>
            <PivotItem linkText="检查" className="padding">
              <DefaultButton primary={true} onClick={this.handleExamination} style={{width: '100%'}}>
                权利要求形式检查
              </DefaultButton>
              {errorList}
            </PivotItem>
            <PivotItem linkText="模板" className="padding">
              {this.state.modelListFlag
                ? <div>
                    <SearchBox placeholder="搜索模板"/>
                    {
                      modelListData.length === 0
                        ? <div style={{marginTop: '10px', paddingLeft: '10px'}}>暂无可应用模板...</div>
                        : <List items={modelListData} onRenderCell={this._onModelListCell}/>
                    }
                    <div style={{display: 'flex', marginTop: '10px'}}>
                      <div style={{flex: 1, paddingRight: '10px'}}>
                        <DefaultButton primary={true} onClick={this.handleExamination} style={{width: '100%'}} disabled={true}>
                          应用模板
                        </DefaultButton>
                      </div>
                      <div style={{flex: 1, paddingLeft: '10px'}}>
                        <DefaultButton primary={true} onClick={this.returnPanel} style={{width: '100%'}}>
                          返回详情
                        </DefaultButton>
                      </div>
                    </div>
                  </div>
                : <div>
                    <Treebeard
                      data={data}
                      onToggle={this.onToggle}
                      style={treeStyle}
                    />
                    <hr />
                    <div style={{textAlign: 'center'}}>案件详情</div>
                    <hr />
                    {caseDetail === null 
                      ? <div style={{padding: '10px 0', paddingLeft: '5px'}}>选择查看案件详情...</div>
                      : <div>
                          <AppFormItem label="案件名称：" labelWidth={labelWidth}>{caseDetail.name}</AppFormItem>
                          <AppFormItem label="案件类型：" labelWidth={labelWidth}>{caseDetail.type}</AppFormItem>
                          <AppFormItem label="内部期限：" labelWidth={labelWidth}>{caseDetail.in_deadline}</AppFormItem>
                          <AppFormItem label="官方绝限：" labelWidth={labelWidth}>{caseDetail.deadline}</AppFormItem>
                          <AppFormItem label="附件：" labelWidth={labelWidth}>{caseDetail.name}</AppFormItem>
                          <AppFormItem label="备注：" labelWidth={labelWidth}>{caseDetail.remark}</AppFormItem>
                          <AppFormItem label="相关案件：" labelWidth={labelWidth}>{caseDetail.name}</AppFormItem>
                          <DefaultButton primary={true} onClick={this.switchPanel} style={{width: '100%'}}>
                            开始撰写
                          </DefaultButton>
                        </div>
                    }
                  </div>
              }
            </PivotItem>
          </Pivot>
          
        </div>
        <MessageBar ref={this.messageBar}/>
      </Fabric>
    );
  }

}
export default hot(module)(App)
