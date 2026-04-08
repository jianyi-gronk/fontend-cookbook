import React from 'react';
import { data } from './mock';

const showNumber = 10;
const topBuffer = 3;
const bottomBuffer = 3;
const defaultItemHeight = 50;
const defaultTotalHeight = defaultItemHeight * data.length;

// 展示窗口样式
const virtualListStyle = {
  height: '500px',
  width: '500px',
  overflow: 'auto',
};

interface VirtualListState {
  totalHeight: number;
  scrollOffset: number;
  renderList: typeof data;
}

export class VirtualList extends React.Component<{}, VirtualListState> {
  // 已经移动出展示窗口的高度
  targetHeight: number;
  // 展示窗口内的第一个元素
  targetIndex: number;
  // 存储每个元素的实际高度
  itemsHeight: number[];

  constructor(props: {}) {
    super(props);
    this.state = {
      totalHeight: defaultTotalHeight,
      scrollOffset: 0,
      renderList: data.slice(0, showNumber + bottomBuffer),
    };

    this.targetHeight = 0;
    this.targetIndex = 0;
    this.itemsHeight = Array.from({ length: data.length }, () => defaultItemHeight);

    this.handleScroll = this.handleScroll.bind(this);
    this.measureHeight = this.measureHeight.bind(this);
  }

  // 处理滚动事件
  handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const scrollTop = e.currentTarget.scrollTop;

    let targetHeight = this.targetHeight;
    let targetIndex = this.targetIndex;
    while ((targetIndex < data.length - showNumber) && (scrollTop - targetHeight) >= this.itemsHeight[targetIndex]) {
      targetHeight += this.itemsHeight[targetIndex];
      targetIndex++;
    }
    while ((targetIndex > 0) && (scrollTop - targetHeight) < 0) {
      targetHeight -= this.itemsHeight[targetIndex - 1];
      targetIndex--;
    }
    this.targetHeight = targetHeight;
    this.targetIndex = targetIndex;

    // 渲染的第一个元素 index
    const topIndex = Math.max(0, targetIndex - topBuffer);

    // 设置展示的元素列表
    const bottomIndex = Math.min(data.length, targetIndex + showNumber + bottomBuffer);
    this.setState({
      renderList: data.slice(topIndex, bottomIndex),
    });

    console.log(topIndex)
    // 设置 y 轴偏移
    // 因为 展示列表 会贴顶 撑起高度的容器，如果不设置，则 撑起高度的容器 下滑时，会导致 展示列表 在展示窗口之外
    const topBufferHeight = this.itemsHeight
      .slice(topIndex, targetIndex)
      .reduce((acc, cur) => acc + cur, 0);
    this.setState({
      scrollOffset: Math.max(0, targetHeight - topBufferHeight),
    });
  }

  // 获取元素高度
  measureHeight(id: number, el: HTMLDivElement | null) {
    if (el && this.itemsHeight[id] !== el.clientHeight) {
      this.setState(prevState => {
        const newTotalHeight = prevState.totalHeight - this.itemsHeight[id] + el.clientHeight;
        this.itemsHeight[id] = el.clientHeight;
        return {
          totalHeight: newTotalHeight,
        }
      });
    }
  }

  render() {
    const { totalHeight, scrollOffset, renderList } = this.state;
    
    // 渲染部分的样式
    const renderListStyle = {
      transform: `translateY(${scrollOffset}px)`,
    };

    return (
      <div onScroll={this.handleScroll} style={virtualListStyle}>
        {/* 用于撑起高度，显示正确高度的滚动条 */}
        <div style={{ height: totalHeight }}>
          {/* 真正渲染的元素列表 */}
          <div style={renderListStyle}>
            {renderList.map((item) => (
              // 在元素渲染完成后，会调用 ref 函数，将元素作为参数传递
              <div
                key={item.id}
                style={{ height: item.height }}
                ref={(el) => this.measureHeight(item.id, el)}
              >
                {`id: ${item.id} first_name: ${item.first_name} last_name: ${item.last_name}`}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default VirtualList;