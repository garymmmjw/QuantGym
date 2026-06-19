import { useEffect, useRef } from "react";
import { useAppServices } from "../../stores/usePageApi.js";

export function TodoShell() {
  const appServices = useAppServices();
  const todoServices = appServices.services || {};
  const todoServicesRef = useRef(todoServices);

  useEffect(() => {
    todoServicesRef.current = todoServices;
  }, [todoServices]);

  const getTodoServices = () => {
    todoServicesRef.current.rebindElements?.();
    return todoServicesRef.current;
  };
  const toggleDock = () => getTodoServices().toggleTodoDock?.();
  const closeDock = () => getTodoServices().closeTodoDock?.();
  const handlePanelClick = (event) => getTodoServices().handleTodoDockClick?.(event);
  const handlePanelChange = (event) => getTodoServices().handleTodoDockEdit?.(event);
  const handleAddSubmit = (event) => {
    event.preventDefault();
    getTodoServices().addTodoTask?.();
  };

  return (
    <section className="todo-dock" aria-label="今日待办" data-i18n-aria-label="todayTodo">
          <button
            id="todoDockButton"
            className="todo-dock-button"
            type="button"
            aria-expanded="false"
            aria-controls="todoDockPanel"
            data-todo-handler="react-native-v2"
            onClick={toggleDock}
          >
            <i data-lucide="list-checks"></i>
            <span id="todoDockButtonLabel">今日待办</span>
            <strong id="todoDockCount">0</strong>
          </button>
          <div id="todoDockPanel" className="todo-dock-panel hidden" onClick={handlePanelClick} onChange={handlePanelChange} onInput={handlePanelChange}>
            <div className="todo-dock-head">
              <div>
                <span className="rank-label" id="todoDockEyebrow">TODAY</span>
                <h2 id="todoDockTitle">To-do list</h2>
              </div>
              <button id="todoDockCloseBtn" className="icon-button ghost" type="button" aria-label="关闭待办" onClick={closeDock}>
                <i data-lucide="x"></i>
              </button>
            </div>
            <p id="todoDockSummary" className="todo-dock-summary">生成今日计划后，这里会同步更新。</p>
            <div id="todoDockList" className="todo-task-list"></div>
            <p id="todoDockEmpty" className="todo-empty hidden">还没有任务。先生成今日计划，或直接添加一个待办。</p>
            <form id="todoDockAddForm" className="todo-add-form" onSubmit={handleAddSubmit}>
              <input id="todoDockAddInput" type="text" maxLength="90" placeholder="添加一个任务" />
              <button className="secondary-button" type="submit">
                <i data-lucide="plus"></i>
                添加
              </button>
            </form>
          </div>
        </section>
  );
}
