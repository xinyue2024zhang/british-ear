# British Ear

一个仅在本机使用的英式英语逐句听写原型。

## 打开

双击 `start.command`，浏览器会自动打开网站。终端窗口需要保持开启；结束时可直接关闭终端窗口。

## 当前内容

- 48 条 ARU Speech Corpus 真人英式录音
- Speaker 03：英国 Berkshire 女声，每句独立 MP3
- A1、A2、B1 难度筛选
- 支持主题、句长和难度组合筛选
- 逐词答案对比
- 答错后可继续修改并再次检查；首次正确率只计算第一次提交
- 错题、正确率和完成数保存在浏览器本地
- 支持 0.75×、1×、1.25× 播放
- 每次可自动播放 1、2、3 或 5 次
- Enter 提交/下一句，Space 播放
- 单按 `F2` 显示或隐藏答案；`Command/Ctrl + /` 仍可作为备用

## 以后导入真实语料

音频放入 `audio/`，并在 `sentences.js` 中按以下格式增加记录：

```js
{id:"唯一编号", text:"标准答案", level:"A2", accent:"Southern British", audio:"audio/example.mp3"}
```

当前音频取自 University of Liverpool 的 ARU Speech Corpus。由于公开镜像中的顺序编号与标准 Harvard 句表不一致，当前48条文本已按实际音频逐条转写并与完整句表核对。原始 WAV 已转换为适合本地网页播放的 MP3。
