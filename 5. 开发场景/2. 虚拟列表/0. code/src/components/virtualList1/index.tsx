import React from 'react';
import { data } from './mock';

const showNumber = 10;
const topBuffer = 3;
const bottomBuffer = 3;
const itemHeight = 50;

// 展示窗口样式
const virtualListStyle = {
  height: '500px',
  width: '500px',
  overflow: 'auto',
};

interface VirtualListState {
  scrollOffset: number;
  renderList: typeof data;
}

export class VirtualList extends React.Component<{}, VirtualListState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      scrollOffset: 0,
      renderList: data.slice(0, showNumber + bottomBuffer),
    };

    this.handleScroll = this.handleScroll.bind(this);
  }

  // 处理滚动事件
  handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const scrollTop = e.currentTarget.scrollTop;
    const targetIndex = Math.floor(scrollTop / itemHeight);

    // 设置渲染的元素列表
    const topIndex = Math.max(0, targetIndex - topBuffer);
    const bottomIndex = Math.min(data.length, targetIndex + showNumber + bottomBuffer);
    this.setState({
      renderList: data.slice(topIndex, bottomIndex),
      // 设置 y 轴偏移
      // 因为 展示列表 会贴顶 撑起高度的容器，如果不设置，则 撑起高度的容器 下滑时，会导致 展示列表 在展示窗口之外
      scrollOffset: itemHeight * topIndex,
    });
  }

  render() {
    const { scrollOffset, renderList } = this.state;

    // 渲染部分的样式
    const renderListStyle = {
      transform: `translateY(${scrollOffset}px)`,
    };

    return (
      <div onScroll={this.handleScroll} style={virtualListStyle}>
        {/* 用于撑起高度，显示正确高度的滚动条 */}
        <div style={{ height: itemHeight * data.length }}>
          {/* 真正渲染的元素列表 */}
          <div style={renderListStyle}>
            {renderList.map((item) => (
              <div key={item.id} style={{ height: itemHeight }}>
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