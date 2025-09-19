/**
 * 자리배치 초기 상태를 생성합니다.
 * @returns {object}
 */
function createInitialState() {
  const sections = [];
  const sectionIds = ["A", "B", "C"];
  const seatsPerSection = 10; // 5 pairs
  let currentSeatId = 1;

  sectionIds.forEach((id) => {
    const pairs = [];
    for (let i = 0; i < seatsPerSection; i += 2) {
      const pairId = `${id}-${i / 2 + 1}`;
      const seatA = createSeat(currentSeatId++);
      const seatB = createSeat(currentSeatId++);
      pairs.push({ pairId, seats: [seatA, seatB] });
    }
    sections.push({ id, pairs });
  });

  return {
    sections,
    teacherDesk: createSeat("T0"),
  };
}

/**
 * 좌석 객체를 생성합니다.
 * @param {number|string} id
 * @returns {{id: number|string, name: string, img: string, empty: boolean}}
 */
function createSeat(id) {
  return {
    id,
    name: "",
    img: "",
    empty: false,
  };
}

const initialState = createInitialState();
let state = deepClone(initialState);
let currentUploadSeatId = null;
let activeDragPair = null;

/**
 * 객체를 깊은 복사합니다.
 * @template T
 * @param {T} value
 * @returns {T}
 */
function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * DOMContentLoaded 이후 초기 렌더와 이벤트를 설정합니다.
 */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  bindGlobalEvents();
});

/**
 * 앱의 주요 이벤트 리스너를 등록합니다.
 */
function bindGlobalEvents() {
  const controlPanel = document.querySelector(".control-panel");
  controlPanel.addEventListener("click", handleControlPanelClick);

  const toggle = document.getElementById("toggle-empty-view");
  toggle.addEventListener("change", (event) => {
    document.body.classList.toggle("show-seat-ids", event.target.checked);
  });

  const seatImageInput = document.getElementById("seat-image-input");
  seatImageInput.addEventListener("change", handleSeatImageSelected);

  const jsonImportInput = document.getElementById("json-import-input");
  jsonImportInput.addEventListener("change", handleJsonImport);

  document.body.addEventListener("click", handleBodyClick);
  document.body.addEventListener("input", handleBodyInput);

  document.body.addEventListener("pointerdown", handlePairHandlePointerDown);
  document.body.addEventListener("pointerup", clearPairDragPreparation);
  document.body.addEventListener("pointercancel", clearPairDragPreparation);

  document.body.addEventListener("dragstart", handleDragStart, true);
  document.body.addEventListener("dragend", handleDragEnd, true);
  document.body.addEventListener("dragover", handleDragOver, true);
  document.body.addEventListener("dragleave", handleDragLeave, true);
  document.body.addEventListener("drop", handleDrop, true);
}

/**
 * 전체 UI를 다시 렌더링합니다.
 */
function renderAll() {
  renderTeacherDesk();
  renderSections();
}

/**
 * 교탁 좌석을 렌더링합니다.
 */
function renderTeacherDesk() {
  const teacherContainer = document.querySelector(".teacher-desk");
  teacherContainer.innerHTML = "";
  const seatWrapper = document.createElement("div");
  seatWrapper.className = "teacher-seat";
  seatWrapper.appendChild(createSeatElement(state.teacherDesk, { isTeacher: true }));
  teacherContainer.appendChild(seatWrapper);
}

/**
 * 학생 섹션을 렌더링합니다.
 */
function renderSections() {
  const container = document.querySelector(".sections-container");
  container.innerHTML = "";

  state.sections.forEach((section) => {
    const sectionEl = document.createElement("div");
    sectionEl.className = "section";
    sectionEl.dataset.sectionId = section.id;

    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = `섹션 ${section.id}`;
    sectionEl.appendChild(title);

    section.pairs.forEach((pair) => {
      sectionEl.appendChild(createPairElement(section.id, pair));
    });

    container.appendChild(sectionEl);
  });
}

/**
 * 페어 요소를 생성합니다.
 * @param {string} sectionId
 * @param {{pairId: string, seats: Array}} pair
 * @returns {HTMLElement}
 */
function createPairElement(sectionId, pair) {
  const pairEl = document.createElement("div");
  pairEl.className = "pair";
  pairEl.dataset.pairId = pair.pairId;
  pairEl.dataset.sectionId = sectionId;

  const handle = document.createElement("button");
  handle.className = "pair-handle";
  handle.type = "button";
  handle.setAttribute("aria-label", "페어 순서 변경");
  handle.innerHTML = "⋮";
  pairEl.appendChild(handle);

  const seatsWrapper = document.createElement("div");
  seatsWrapper.className = "seats-wrapper";
  pair.seats.forEach((seat) => {
    seatsWrapper.appendChild(createSeatElement(seat));
  });
  pairEl.appendChild(seatsWrapper);

  return pairEl;
}

/**
 * 좌석 카드 요소를 생성합니다.
 * @param {{id: number|string, name: string, img: string, empty: boolean}} seat
 * @param {{isTeacher?: boolean}} [options]
 * @returns {HTMLElement}
 */
function createSeatElement(seat, options = {}) {
  const seatCard = document.createElement("article");
  seatCard.className = "seat-card";
  seatCard.dataset.seatId = String(seat.id);

  if (seat.empty) {
    seatCard.classList.add("empty");
  }
  if (seat.img) {
    seatCard.classList.add("has-image");
  }
  if (options.isTeacher) {
    seatCard.classList.add("teacher-seat-card");
  }

  const menuBtn = document.createElement("button");
  menuBtn.type = "button";
  menuBtn.className = "seat-menu-btn";
  menuBtn.dataset.action = "toggle-menu";
  menuBtn.setAttribute("aria-label", "좌석 메뉴 열기");
  menuBtn.textContent = "⋯";
  seatCard.appendChild(menuBtn);

  const menu = document.createElement("div");
  menu.className = "seat-menu";
  const uploadBtn = document.createElement("button");
  uploadBtn.type = "button";
  uploadBtn.dataset.action = "upload-image";
  uploadBtn.textContent = "이미지 업로드";
  menu.appendChild(uploadBtn);

  const toggleEmptyBtn = document.createElement("button");
  toggleEmptyBtn.type = "button";
  toggleEmptyBtn.dataset.action = seat.empty ? "restore-seat" : "mark-empty";
  toggleEmptyBtn.textContent = seat.empty ? "자리 만들기" : "빈 자리로 만들기";
  menu.appendChild(toggleEmptyBtn);

  const clearImgBtn = document.createElement("button");
  clearImgBtn.type = "button";
  clearImgBtn.dataset.action = "clear-image";
  clearImgBtn.textContent = "이미지 리셋";
  menu.appendChild(clearImgBtn);

  seatCard.appendChild(menu);

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "seat-image-wrapper";
  imageWrapper.dataset.action = "upload-image";
  if (seat.img) {
    const img = document.createElement("img");
    img.src = seat.img;
    img.alt = `${seat.id}번 자리 이미지`;
    img.draggable = true;
    img.className = "seat-photo";
    img.dataset.seatId = String(seat.id);
    imageWrapper.appendChild(img);
  } else if (!seat.empty) {
    const placeholder = document.createElement("span");
    placeholder.textContent = "이미지 없음";
    imageWrapper.appendChild(placeholder);
  }

  const clearImageBtn = document.createElement("button");
  clearImageBtn.type = "button";
  clearImageBtn.className = "clear-image-btn";
  clearImageBtn.dataset.action = "clear-image";
  clearImageBtn.innerHTML = "&times;";
  imageWrapper.appendChild(clearImageBtn);
  seatCard.appendChild(imageWrapper);

  const seatBody = document.createElement("div");
  seatBody.className = "seat-body";
  const label = document.createElement("label");
  const inputId = `seat-name-${String(seat.id).replace(/[^a-zA-Z0-9_-]/g, "")}`;
  label.setAttribute("for", inputId);
  label.innerHTML = `<span>이름</span>`;
  const input = document.createElement("input");
  input.type = "text";
  input.id = inputId;
  input.className = "seat-name-input";
  input.placeholder = "이름을 입력하세요";
  input.value = seat.name;
  input.dataset.seatId = String(seat.id);
  label.appendChild(input);
  seatBody.appendChild(label);
  seatCard.appendChild(seatBody);

  const emptyIndicator = document.createElement("div");
  emptyIndicator.className = "empty-indicator";
  emptyIndicator.textContent = String(seat.id);
  seatCard.appendChild(emptyIndicator);

  const idBadge = document.createElement("span");
  idBadge.className = "seat-id-badge";
  idBadge.textContent = String(seat.id);
  seatCard.appendChild(idBadge);

  return seatCard;
}

/**
 * 컨트롤 패널 버튼 클릭을 처리합니다.
 * @param {MouseEvent} event
 */
function handleControlPanelClick(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  switch (action) {
    case "shuffle":
      shufflePairs();
      renderAll();
      break;
    case "reset":
      state = deepClone(initialState);
      document.getElementById("toggle-empty-view").checked = false;
      document.body.classList.remove("show-seat-ids");
      renderAll();
      break;
    case "save-png":
      downloadPNG();
      break;
    case "export-json":
      exportJSON();
      break;
    case "import-json":
      document.getElementById("json-import-input").click();
      break;
    default:
      break;
  }
}

/**
 * 문서 클릭을 처리합니다.
 * @param {MouseEvent} event
 */
function handleBodyClick(event) {
  const menuBtn = event.target.closest("[data-action='toggle-menu']");
  const seatCard = event.target.closest(".seat-card");

  if (menuBtn && seatCard) {
    event.stopPropagation();
    const menu = seatCard.querySelector(".seat-menu");
    const isOpen = menu.classList.contains("open");
    closeAllSeatMenus();
    if (!isOpen) {
      menu.classList.add("open");
    }
    return;
  }

  const actionButton = event.target.closest(".seat-card [data-action]");
  if (actionButton && seatCard) {
    const seatId = seatCard.dataset.seatId;
    const action = actionButton.dataset.action;
    switch (action) {
      case "upload-image":
        currentUploadSeatId = seatId;
        document.getElementById("seat-image-input").click();
        break;
      case "mark-empty":
        setSeatEmpty(seatId, true);
        renderAll();
        break;
      case "restore-seat":
        setSeatEmpty(seatId, false);
        renderAll();
        break;
      case "clear-image":
        setSeatImage(seatId, "");
        renderAll();
        break;
      default:
        break;
    }
    closeAllSeatMenus();
    return;
  }

  // 메뉴 외 영역 클릭 시 메뉴 닫기
  if (!event.target.closest(".seat-menu")) {
    closeAllSeatMenus();
  }
}

/**
 * 이름 입력 변경을 처리합니다.
 * @param {InputEvent} event
 */
function handleBodyInput(event) {
  const input = event.target.closest(".seat-name-input");
  if (!input) return;
  const seatId = input.dataset.seatId;
  const seat = findSeatById(seatId);
  if (seat) {
    seat.name = input.value;
  }
}

/**
 * 모든 좌석 메뉴를 닫습니다.
 */
function closeAllSeatMenus() {
  document.querySelectorAll(".seat-menu.open").forEach((menu) => menu.classList.remove("open"));
}

/**
 * 좌석 이미지 파일 선택을 처리합니다.
 * @param {Event} event
 */
function handleSeatImageSelected(event) {
  const input = event.target;
  const files = input.files;
  if (!files || !files[0] || !currentUploadSeatId) {
    input.value = "";
    return;
  }

  processImageFile(files[0])
    .then((dataUrl) => {
      setSeatImage(currentUploadSeatId, dataUrl);
      renderAll();
    })
    .catch((error) => {
      alert(error.message);
    })
    .finally(() => {
      input.value = "";
      currentUploadSeatId = null;
    });
}

/**
 * JSON 파일 불러오기를 처리합니다.
 * @param {Event} event
 */
function handleJsonImport(event) {
  const input = event.target;
  const files = input.files;
  if (!files || !files[0]) {
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (validateImportedState(parsed)) {
        state = parsed;
        renderAll();
      } else {
        throw new Error("유효하지 않은 JSON 구조입니다.");
      }
    } catch (error) {
      alert(error.message || "JSON을 불러올 수 없습니다.");
    } finally {
      input.value = "";
    }
  };
  reader.readAsText(files[0]);
}

/**
 * 불러온 JSON 구조를 검증합니다.
 * @param {any} data
 * @returns {boolean}
 */
function validateImportedState(data) {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.sections)) return false;
  if (!data.teacherDesk) return false;
  const sectionValid = data.sections.every((section) => {
    if (!section || typeof section !== "object") return false;
    if (!Array.isArray(section.pairs)) return false;
    return section.pairs.every((pair) => {
      if (!pair || typeof pair !== "object" || !Array.isArray(pair.seats)) return false;
      return pair.seats.every((seat) => seat && typeof seat === "object" && "id" in seat);
    });
  });
  return sectionValid;
}

/**
 * 좌석에 이미지를 설정합니다.
 * @param {string|number} seatId
 * @param {string} dataUrl
 */
function setSeatImage(seatId, dataUrl) {
  const seat = findSeatById(seatId);
  if (!seat) return;
  seat.img = dataUrl || "";
  if (dataUrl) {
    seat.empty = false;
  }
}

/**
 * 좌석의 빈 자리 상태를 설정합니다.
 * @param {string|number} seatId
 * @param {boolean} isEmpty
 */
function setSeatEmpty(seatId, isEmpty) {
  const seat = findSeatById(seatId);
  if (!seat) return;
  seat.empty = isEmpty;
  if (isEmpty) {
    seat.name = "";
    seat.img = "";
  }
}

/**
 * 지정된 좌석을 찾습니다.
 * @param {string|number} seatId
 * @returns {{id: string|number, name: string, img: string, empty: boolean}|undefined}
 */
function findSeatById(seatId) {
  if (String(state.teacherDesk.id) === String(seatId)) {
    return state.teacherDesk;
  }
  for (const section of state.sections) {
    for (const pair of section.pairs) {
      for (const seat of pair.seats) {
        if (String(seat.id) === String(seatId)) {
          return seat;
        }
      }
    }
  }
  return undefined;
}

/**
 * 이미지 파일을 읽고 필요 시 리사이즈합니다.
 * @param {File} file
 * @returns {Promise<string>}
 */
function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|gif)$/i.test(file.type)) {
      reject(new Error("JPG/PNG/GIF 형식의 이미지 파일만 사용할 수 있습니다."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (!result) {
        reject(new Error("이미지를 불러오지 못했습니다."));
        return;
      }

      if (file.type.toLowerCase() === "image/gif") {
        resolve(String(result));
        return;
      }

      const image = new Image();
      image.onload = () => {
        const maxSize = 320;
        const maxDimension = Math.max(image.width, image.height);
        if (maxDimension <= maxSize) {
          resolve(String(result));
          return;
        }
        const scale = maxSize / maxDimension;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(result));
          return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => reject(new Error("이미지를 처리할 수 없습니다."));
      image.src = String(result);
    };
    reader.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    reader.readAsDataURL(file);
  });
}

/**
 * 랜덤으로 페어 위치를 섞습니다.
 */
function shufflePairs() {
  const pairsData = state.sections.map((section) => section.pairs.map((pair) => ({
    seats: pair.seats.map((seat) => ({
      name: seat.name,
      img: seat.img,
      empty: seat.empty,
    })),
  })));

  const flattenedPairs = pairsData.flat();

  for (let i = flattenedPairs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [flattenedPairs[i], flattenedPairs[j]] = [flattenedPairs[j], flattenedPairs[i]];
  }

  let index = 0;
  state.sections.forEach((section) => {
    section.pairs.forEach((pair) => {
      const data = flattenedPairs[index++];
      pair.seats.forEach((seat, seatIndex) => {
        const dataSeat = data.seats[seatIndex];
        seat.name = dataSeat.name;
        seat.img = dataSeat.img;
        seat.empty = dataSeat.empty;
      });
    });
  });
}

/**
 * PNG 파일로 저장합니다.
 */
function downloadPNG() {
  const target = document.querySelector(".sections-area");
  if (!target) return;
  html2canvas(target, {
    backgroundColor: "#ffffff",
    scale: window.devicePixelRatio,
  }).then((canvas) => {
    const link = document.createElement("a");
    link.download = "자리배치.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

/**
 * JSON으로 내보냅니다.
 */
function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "seat-map.json";
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 페어 핸들 포인터다운을 처리합니다.
 * @param {PointerEvent} event
 */
function handlePairHandlePointerDown(event) {
  const handle = event.target.closest(".pair-handle");
  if (!handle) return;
  const pair = handle.closest(".pair");
  if (!pair) return;
  pair.dataset.dragReady = "true";
  pair.setAttribute("draggable", "true");
}

/**
 * 페어 드래그 준비 상태를 초기화합니다.
 * @param {PointerEvent} event
 */
function clearPairDragPreparation(event) {
  if (!event) return;
  document.querySelectorAll(".pair[data-drag-ready='true']").forEach((pair) => {
    pair.removeAttribute("data-drag-ready");
    pair.removeAttribute("draggable");
  });
}

/**
 * 드래그 시작을 처리합니다.
 * @param {DragEvent} event
 */
function handleDragStart(event) {
  const pair = event.target.closest && event.target.closest(".pair");
  if (pair) {
    if (pair.dataset.dragReady !== "true") {
      event.preventDefault();
      return;
    }
    pair.classList.add("dragging");
    activeDragPair = {
      pairId: pair.dataset.pairId,
      sectionId: pair.dataset.sectionId,
    };
    event.dataTransfer.effectAllowed = "move";
    pair.removeAttribute("data-drag-ready");
    return;
  }

  const seatImage = event.target.closest && event.target.closest("img.seat-photo");
  if (seatImage) {
    const seatId = seatImage.dataset.seatId;
    if (seatId) {
      event.dataTransfer.setData("application/seat-image", seatId);
      event.dataTransfer.setData("text/plain", seatId);
      event.dataTransfer.effectAllowed = "move";
    }
  }
}

/**
 * 드래그 종료를 처리합니다.
 * @param {DragEvent} event
 */
function handleDragEnd(event) {
  const pair = event.target.closest && event.target.closest(".pair");
  if (pair) {
    pair.classList.remove("dragging");
    pair.removeAttribute("draggable");
    activeDragPair = null;
    document.querySelectorAll(".pair.drag-over").forEach((el) => el.classList.remove("drag-over"));
    return;
  }

  const seatCard = event.target.closest && event.target.closest(".seat-card");
  if (seatCard) {
    seatCard.classList.remove("drag-target");
  }
}

/**
 * 드래그 오버를 처리합니다.
 * @param {DragEvent} event
 */
function handleDragOver(event) {
  const pair = event.target.closest && event.target.closest(".pair");
  if (pair && activeDragPair) {
    const sectionId = pair.dataset.sectionId;
    if (sectionId === activeDragPair.sectionId) {
      event.preventDefault();
      pair.classList.add("drag-over");
    }
    return;
  }

  const seatCard = event.target.closest && event.target.closest(".seat-card");
  if (seatCard && allowSeatDrop(event)) {
    event.preventDefault();
    seatCard.classList.add("drag-target");
  }
}

/**
 * 드래그 리브를 처리합니다.
 * @param {DragEvent} event
 */
function handleDragLeave(event) {
  const pair = event.target.closest && event.target.closest(".pair");
  if (pair) {
    pair.classList.remove("drag-over");
    return;
  }

  const seatCard = event.target.closest && event.target.closest(".seat-card");
  if (seatCard) {
    seatCard.classList.remove("drag-target");
  }
}

/**
 * 드롭을 처리합니다.
 * @param {DragEvent} event
 */
function handleDrop(event) {
  const pair = event.target.closest && event.target.closest(".pair");
  if (pair && activeDragPair) {
    const sectionId = pair.dataset.sectionId;
    if (sectionId === activeDragPair.sectionId) {
      event.preventDefault();
      reorderPairs(sectionId, activeDragPair.pairId, pair.dataset.pairId);
      renderAll();
    }
    return;
  }

  const seatCard = event.target.closest && event.target.closest(".seat-card");
  if (seatCard && allowSeatDrop(event)) {
    event.preventDefault();
    seatCard.classList.remove("drag-target");
    const seatId = seatCard.dataset.seatId;
    if (!seatId) return;

    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      processImageFile(file)
        .then((dataUrl) => {
          setSeatImage(seatId, dataUrl);
          renderAll();
        })
        .catch((error) => alert(error.message));
    } else {
      const sourceSeatId = event.dataTransfer.getData("application/seat-image") || event.dataTransfer.getData("text/plain");
      if (sourceSeatId) {
        swapSeatImages(sourceSeatId, seatId);
        renderAll();
      }
    }
  }
}

/**
 * 좌석 드롭이 가능한지 확인합니다.
 * @param {DragEvent} event
 * @returns {boolean}
 */
function allowSeatDrop(event) {
  if (!event.dataTransfer) return false;
  if (event.dataTransfer.files && event.dataTransfer.files.length > 0) return true;
  const types = Array.from(event.dataTransfer.types || []);
  return types.includes("application/seat-image") || types.includes("text/plain");
}

/**
 * 페어 순서를 재정렬합니다.
 * @param {string} sectionId
 * @param {string} fromPairId
 * @param {string} toPairId
 */
function reorderPairs(sectionId, fromPairId, toPairId) {
  const section = state.sections.find((sec) => sec.id === sectionId);
  if (!section) return;
  const fromIndex = section.pairs.findIndex((pair) => pair.pairId === fromPairId);
  const toIndex = section.pairs.findIndex((pair) => pair.pairId === toPairId);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
  const [moved] = section.pairs.splice(fromIndex, 1);
  section.pairs.splice(toIndex, 0, moved);
}

/**
 * 좌석 간 이미지를 교환합니다.
 * @param {string|number} sourceId
 * @param {string|number} targetId
 */
function swapSeatImages(sourceId, targetId) {
  const sourceSeat = findSeatById(sourceId);
  const targetSeat = findSeatById(targetId);
  if (!sourceSeat || !targetSeat) return;
  const temp = sourceSeat.img;
  sourceSeat.img = targetSeat.img;
  targetSeat.img = temp;
  if (sourceSeat.img) sourceSeat.empty = false;
  if (targetSeat.img) targetSeat.empty = false;
}

