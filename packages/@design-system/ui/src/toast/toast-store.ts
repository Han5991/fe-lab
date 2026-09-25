import { createStore, useStore } from './store';
import { ToastData, ToastPosition, ToastsState } from './types';
import { randomId } from './utils';

export type ToastStore = ReturnType<typeof createToastStore>;

const createToastStore = () =>
  createStore<ToastsState>({
    toasts: [],
    queue: [],
    defaultPosition: 'top-center',
    limit: 3,
  });

const toastsStore = createToastStore();

function getDistributedToasts(
  data: ToastData[],
  defaultPosition: ToastPosition,
  limit: number,
) {
  const queue: ToastData[] = [];
  const toasts: ToastData[] = [];
  const count: Record<string, number> = {};

  data.forEach(item => {
    const position = item.position || defaultPosition;
    count[position] = count[position] || 0;
    count[position] += 1;

    if (count[position] <= limit) {
      toasts.push(item);
    } else {
      queue.push(item);
    }
  });

  return { toasts, queue };
}

/**
 * 보이는 토스트와 대기열을 합친 전체 목록에 update를 적용한 뒤 다시 나눈다.
 * 대기열을 버리면 limit을 넘은 토스트가 조용히 사라지고, 앞의 것이 닫혀도 올라오지 않는다.
 */
function updateToastsState(
  store: ToastStore,
  update: (toasts: ToastData[]) => ToastData[],
) {
  const state = store.getState();
  const toasts = update([...state.toasts, ...state.queue]);
  const updated = getDistributedToasts(
    toasts,
    state.defaultPosition,
    state.limit,
  );

  store.setState({
    ...state,
    toasts: updated.toasts,
    queue: updated.queue,
  });
}

function showToast(toast: ToastData, store: ToastStore = toastsStore) {
  const id = toast.id || randomId();

  updateToastsState(store, toasts => {
    if (toast.id && toasts.some(n => n.id === toast.id)) {
      return toasts;
    }
    return [...toasts, { ...toast, id }];
  });

  return id;
}

function hideToast(id: string, store: ToastStore = toastsStore) {
  updateToastsState(store, toasts => toasts.filter(toast => toast.id !== id));
  return id;
}

function updateToast(toast: ToastData, store: ToastStore = toastsStore) {
  updateToastsState(store, toasts =>
    toasts.map(item => {
      if (item.id === toast.id) {
        return { ...item, ...toast };
      }
      return item;
    }),
  );
  return toast.id;
}

function cleanToasts(store: ToastStore = toastsStore) {
  updateToastsState(store, () => []);
}

function cleanToastsQueue(store: ToastStore = toastsStore) {
  // 떠 있는 토스트는 두고 대기열만 비운다
  updateToastsState(store, () => [...store.getState().toasts]);
}

export const toasts = {
  show: showToast,
  hide: hideToast,
  update: updateToast,
  clean: cleanToasts,
  cleanQueue: cleanToastsQueue,
} as const;

export const useToasts = (store: ToastStore = toastsStore) => useStore(store);

export function useDistributedToasts(store: ToastStore = toastsStore) {
  // 스토어가 이미 보이는 것(toasts)과 대기열(queue)로 나눠 들고 있다
  return useToasts(store);
}
