/***************************************************************
 * TECH LOGGER
 * BADGE PRINTING SYSTEM
 *
 * FIXED LABEL:
 * 50mm WIDE × 80mm TALL
 ***************************************************************/


/* =============================================================
   API
============================================================= */

const API_URL =
  "https://script.google.com/macros/s/AKfycbwzjP7-Qk0yDBshiUeR-OF5ushwmNTRXsEv-XhGrx4A-G5USqoBLuDPHOqYjcbY-pZJ/exec";


/* =============================================================
   GLOBAL STATE
============================================================= */

let currentEvent = null;

let participants = [];

let filteredParticipants = [];

let selectedParticipant = null;


/* =============================================================
   INITIALIZE
============================================================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {

    initializeTheme();

    initializeSearch();

    loadPageData();

  }
);


/* =============================================================
   LOAD PAGE DATA
============================================================= */

async function loadPageData() {

  try {

    showLoading(
      "Loading badge station..."
    );


    const params =
      new URLSearchParams(
        window.location.search
      );


    /*
     * Expected URL:
     *
     * badge.html?eventId=TL-2026-0915004611
     */

    const eventId =
      params.get("eventId") ||
      params.get("event");


    /*
     * If EventID exists,
     * load participants directly.
     */

    if (eventId) {

      currentEvent = {

        EventID:
          eventId,

        Name:
          eventId

      };


      updateEventHeader();


      await loadParticipants();


      hideLoading();

      return;

    }


    /*
     * No event ID.
     *
     * Try to find an active event.
     */

    try {

      const result =
        await apiGet(
          "events"
        );


      if (
        !result ||
        !result.success
      ) {

        throw new Error(
          "Unable to load events."
        );

      }


      const events =
        result.events || [];


      if (!events.length) {

        throw new Error(
          "No events found."
        );

      }


      /*
       * Look for active/open event.
       */

      let event =
        events.find(
          function (item) {

            const status =
              String(
                item.Status || ""
              )
                .trim()
                .toLowerCase();


            return (
              status === "active" ||
              status === "open"
            );

          }
        );


      /*
       * Otherwise use first event.
       */

      if (!event) {

        event =
          events[0];

      }


      currentEvent =
        event;


      updateEventHeader();


      await loadParticipants();


    } catch (error) {

      console.error(
        "Event discovery failed:",
        error
      );


      showPageError(
        "No event selected. Open the badge page using ?eventId=YOUR_EVENT_ID"
      );


      hideLoading();

      return;

    }


    hideLoading();


  } catch (error) {

    console.error(
      "Page loading failed:",
      error
    );


    hideLoading();


    showPageError(
      error.message ||
      "Unable to load badge station."
    );

  }

}


/* =============================================================
   LOAD PARTICIPANTS
============================================================= */

async function loadParticipants() {

  if (
    !currentEvent ||
    !currentEvent.EventID
  ) {

    throw new Error(
      "Event ID is missing."
    );

  }


  const result =
    await apiGet(
      "participants",
      {

        eventId:
          currentEvent.EventID

      }
    );


  if (
    !result ||
    !result.success
  ) {

    throw new Error(
      result &&
      result.message
        ? result.message
        : "Unable to load participants."
    );

  }


  participants =
    Array.isArray(
      result.participants
    )
      ? result.participants
      : [];


  filteredParticipants =
    participants.slice();


  updateEventHeader();

  updateStats();

  renderParticipants();

}


/* =============================================================
   UPDATE EVENT HEADER
============================================================= */

function updateEventHeader() {

  const header =
    document.getElementById(
      "eventHeader"
    );


  if (!header) {
    return;
  }


  if (!currentEvent) {

    header.textContent =
      "No event";

    return;

  }


  header.textContent =
    currentEvent.Name ||
    currentEvent.EventName ||
    currentEvent.EventID ||
    "Active Event";

}


/* =============================================================
   UPDATE STATISTICS
============================================================= */

function updateStats() {

  const total =
    participants.length;


  const printed =
    participants.filter(
      function (participant) {

        return (
          String(
            participant.BadgeStatus || ""
          )
            .trim()
            .toLowerCase() ===
          "printed"
        );

      }
    ).length;


  const left =
    Math.max(
      total - printed,
      0
    );


  setText(
    "totalRegistered",
    total
  );


  setText(
    "totalPrinted",
    printed
  );


  setText(
    "totalLeft",
    left
  );


  setText(
    "participantCount",
    total +
    (
      total === 1
        ? " participant"
        : " participants"
    )
  );

}


/* =============================================================
   SEARCH
============================================================= */

function initializeSearch() {

  const search =
    document.getElementById(
      "participantSearch"
    );


  if (!search) {
    return;
  }


  search.addEventListener(
    "input",
    function () {

      const query =
        search.value
          .trim()
          .toLowerCase();


      if (!query) {

        filteredParticipants =
          participants.slice();

      } else {

        filteredParticipants =
          participants.filter(
            function (participant) {

              const fields = [

                participant.RegistrationNumber,

                participant.FullName,

                participant.Organisation,

                participant.Category,

                participant.Phone,

                participant.Position,

                participant.Region,

                participant.Email,

                participant.StaffID,

                participant.Gender

              ];


              return fields.some(
                function (value) {

                  return String(
                    value || ""
                  )
                    .toLowerCase()
                    .includes(query);

                }
              );

            }
          );

      }


      renderParticipants();

    }
  );

}


/* =============================================================
   RENDER PARTICIPANTS
============================================================= */

function renderParticipants() {

  const container =
    document.getElementById(
      "participantList"
    );


  if (!container) {
    return;
  }


  if (!filteredParticipants.length) {

    container.innerHTML = `

      <div class="text-center text-muted py-5">

        <i
          class="bi bi-person-x"
          style="font-size:30px;">
        </i>

        <div class="mt-2">

          No participants found.

        </div>

      </div>

    `;

    return;
  }


  container.innerHTML =
    filteredParticipants
      .map(
        function (
          participant,
          index
        ) {

          const isSelected =
            selectedParticipant &&
            selectedParticipant
              .RegistrationNumber ===
            participant
              .RegistrationNumber;


          const printed =
            String(
              participant.BadgeStatus || ""
            )
              .trim()
              .toLowerCase() ===
            "printed";


          return `

            <div
              class="participant-item
              ${isSelected ? "active" : ""}"
              onclick="selectParticipant(${index})">


              <div
                class="d-flex
                justify-content-between
                align-items-start">


                <div
                  class="participant-name">

                  ${escapeHtml(
                    participant.Title || ""
                  )}

                  ${escapeHtml(
                    participant.FullName ||
                    "Unnamed"
                  )}

                </div>


                <span
                  class="badge-status
                  ${
                    printed
                      ? "bg-success-subtle text-success"
                      : "bg-warning-subtle text-warning-emphasis"
                  }">

                  ${
                    printed
                      ? "PRINTED"
                      : "NOT PRINTED"
                  }

                </span>


              </div>


              <div
                class="participant-meta">

                ${escapeHtml(
                  participant.RegistrationNumber ||
                  ""
                )}

                &nbsp; • &nbsp;

                ${escapeHtml(
                  participant.Organisation ||
                  ""
                )}

              </div>


              <div
                class="participant-meta">

                ${escapeHtml(
                  participant.Position ||
                  ""
                )}

                ${
                  participant.Region
                    ? " • " +
                      escapeHtml(
                        participant.Region
                      )
                    : ""
                }

              </div>


            </div>

          `;

        }
      )
      .join("");

}


/* =============================================================
   SELECT PARTICIPANT
============================================================= */

function selectParticipant(index) {

  const participant =
    filteredParticipants[index];


  if (!participant) {
    return;
  }


  selectedParticipant =
    participant;


  renderParticipants();


  renderBadge(
    participant
  );

}


/* =============================================================
   RENDER BADGE
============================================================= */

function renderBadge(
  participant
) {

  const emptyPreview =
    document.getElementById(
      "emptyPreview"
    );


  const badge =
    document.getElementById(
      "printBadge"
    );


  if (emptyPreview) {

    emptyPreview.style.display =
      "none";

  }


  if (badge) {

    badge.style.display =
      "flex";

  }


  /*
   * EVENT NAME
   */

  const eventName =
    currentEvent &&
    (
      currentEvent.Name ||
      currentEvent.EventName ||
      currentEvent.EventID
    )
      ? (
          currentEvent.Name ||
          currentEvent.EventName ||
          currentEvent.EventID
        )
      : "EVENT NAME";


  setText(
    "badgeEvent",
    eventName
  );


  /*
   * ORGANISATION
   */

  setText(
    "badgeOrganisation",
    participant.Organisation ||
    "ORGANISATION"
  );


  /*
   * NAME
   */

  setText(
    "badgeName",
    participant.FullName ||
    "PARTICIPANT NAME"
  );


  /*
   * POSITION
   */

  setText(
    "badgePosition",
    participant.Position ||
    ""
  );


  /*
   * CATEGORY
   */

  setText(
    "badgeCategory",
    participant.Category ||
    "—"
  );


  /*
   * REGION
   */

  setText(
    "badgeRegion",
    participant.Region ||
    "—"
  );


  /*
   * REGISTRATION NUMBER
   */

  const registration =
    participant.RegistrationNumber ||
    participant.QRCode ||
    "—";


  setText(
    "badgeRegistration",
    registration
  );


  /*
   * UNIQUE CODE
   */

  const uniqueCode =
    participant.QRCode ||
    participant.RegistrationNumber ||
    "—";


  setText(
    "badgeUniqueCode",
    uniqueCode
  );


  /*
   * QR CODE
   */

  const qr =
    document.getElementById(
      "badgeQr"
    );


  if (qr) {

    const qrData =
      encodeURIComponent(
        uniqueCode
      );


    qr.src =
      "https://api.qrserver.com/v1/create-qr-code/" +
      "?size=300x300" +
      "&data=" +
      qrData;

  }


  /*
   * ENABLE PRINT
   */

  const printButton =
    document.getElementById(
      "printButton"
    );


  if (printButton) {

    printButton.disabled =
      false;

  }

}


/* =============================================================
   PRINT BADGE
============================================================= */

async function printSelectedBadge() {

  if (!selectedParticipant) {

    showToast(
      "Please select a participant first.",
      "warning"
    );

    return;

  }


  if (
    !currentEvent ||
    !currentEvent.EventID
  ) {

    showToast(
      "Event ID is missing.",
      "danger"
    );

    return;

  }


  const registrationNumber =
    selectedParticipant
      .RegistrationNumber ||
    selectedParticipant.QRCode;


  if (!registrationNumber) {

    showToast(
      "Participant registration number is missing.",
      "danger"
    );

    return;

  }


  try {

    showLoading(
      "Preparing badge..."
    );


    /*
     * Mark badge as printed.
     */

    const result =
      await apiPost(
        "printBadge",
        {

          eventId:
            currentEvent.EventID,

          registrationNumber:
            registrationNumber

        }
      );


    if (
      !result ||
      !result.success
    ) {

      throw new Error(
        result &&
        result.message
          ? result.message
          : "Unable to mark badge as printed."
      );

    }


    /*
     * Update local record.
     */

    selectedParticipant.BadgeStatus =
      "Printed";


    updateStats();

    renderParticipants();


    hideLoading();


    showToast(
      "Badge marked as printed. Opening print preview...",
      "success"
    );


    /*
     * Small delay to ensure
     * preview is updated.
     */

    setTimeout(
      function () {

        window.print();

      },
      300
    );


  } catch (error) {

    console.error(
      "Print error:",
      error
    );


    hideLoading();


    showToast(
      error.message ||
      "Unable to print badge.",
      "danger"
    );

  }

}


/* =============================================================
   CLEAR SELECTION
============================================================= */

function clearSelection() {

  selectedParticipant =
    null;


  const badge =
    document.getElementById(
      "printBadge"
    );


  const emptyPreview =
    document.getElementById(
      "emptyPreview"
    );


  if (badge) {

    badge.style.display =
      "none";

  }


  if (emptyPreview) {

    emptyPreview.style.display =
      "block";

  }


  const printButton =
    document.getElementById(
      "printButton"
    );


  if (printButton) {

    printButton.disabled =
      true;

  }


  renderParticipants();

}


/* =============================================================
   THEME
============================================================= */

function initializeTheme() {

  try {

    const saved =
      localStorage.getItem(
        "techLoggerTheme"
      );


    if (
      saved === "dark"
    ) {

      document.body.classList.add(
        "dark-mode"
      );

    }


    updateThemeButton();

  } catch (error) {

    console.warn(
      "Theme initialization failed:",
      error
    );

  }

}


/* =============================================================
   TOGGLE THEME
============================================================= */

function toggleTheme() {

  document.body.classList.toggle(
    "dark-mode"
  );


  const dark =
    document.body.classList.contains(
      "dark-mode"
    );


  try {

    localStorage.setItem(
      "techLoggerTheme",
      dark
        ? "dark"
        : "light"
    );

  } catch (error) {}


  updateThemeButton();

}


/* =============================================================
   UPDATE THEME BUTTON
============================================================= */

function updateThemeButton() {

  const button =
    document.getElementById(
      "themeButton"
    );


  if (!button) {
    return;
  }


  const dark =
    document.body.classList.contains(
      "dark-mode"
    );


  button.innerHTML =
    dark
      ? '<i class="bi bi-sun"></i>'
      : '<i class="bi bi-moon"></i>';

}


/* =============================================================
   REFRESH
============================================================= */

function refreshPage() {

  window.location.reload();

}


/* =============================================================
   API GET
============================================================= */

async function apiGet(
  action,
  params = {}
) {

  const url =
    new URL(API_URL);


  url.searchParams.set(
    "action",
    action
  );


  Object.keys(params)
    .forEach(
      function (key) {

        if (
          params[key] !== undefined &&
          params[key] !== null
        ) {

          url.searchParams.set(
            key,
            params[key]
          );

        }

      }
    );


  const response =
    await fetch(
      url.toString(),
      {

        method: "GET",

        cache: "no-store"

      }
    );


  if (!response.ok) {

    throw new Error(
      "API request failed: " +
      response.status
    );

  }


  return await response.json();

}


/* =============================================================
   API POST
============================================================= */

async function apiPost(
  action,
  payload = {}
) {

  const body =
    Object.assign(
      {},
      payload,
      {
        action:
          action
      }
    );


  const response =
    await fetch(
      API_URL,
      {

        method: "POST",

        headers: {

          "Content-Type":
            "text/plain;charset=utf-8"

        },

        body:
          JSON.stringify(body)

      }
    );


  if (!response.ok) {

    throw new Error(
      "API request failed: " +
      response.status
    );

  }


  return await response.json();

}


/* =============================================================
   LOADING
============================================================= */

function showLoading(
  message
) {

  const overlay =
    document.getElementById(
      "loadingOverlay"
    );


  const text =
    document.getElementById(
      "loadingText"
    );


  if (text) {

    text.textContent =
      message ||
      "Loading...";

  }


  if (overlay) {

    overlay.style.display =
      "flex";

  }

}


/* =============================================================
   HIDE LOADING
============================================================= */

function hideLoading() {

  const overlay =
    document.getElementById(
      "loadingOverlay"
    );


  if (overlay) {

    overlay.style.display =
      "none";

  }

}


/* =============================================================
   TOAST
============================================================= */

function showToast(
  message,
  type = "info"
) {

  const container =
    document.getElementById(
      "toastContainer"
    );


  if (!container) {
    return;
  }


  const toast =
    document.createElement(
      "div"
    );


  toast.className =
    "alert alert-" +
    type +
    " shadow-sm";


  toast.style.minWidth =
    "260px";


  toast.style.fontSize =
    "13px";


  toast.textContent =
    message;


  container.appendChild(
    toast
  );


  setTimeout(
    function () {

      toast.remove();

    },
    3500
  );

}


/* =============================================================
   PAGE ERROR
============================================================= */

function showPageError(
  message
) {

  const container =
    document.getElementById(
      "participantList"
    );


  if (!container) {
    return;
  }


  container.innerHTML = `

    <div
      class="alert alert-danger m-2">

      <div class="fw-bold mb-1">

        Badge Station Error

      </div>

      <div>

        ${escapeHtml(message)}

      </div>

    </div>

  `;

}


/* =============================================================
   SET TEXT
============================================================= */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value === null ||
      value === undefined
        ? ""
        : value;

  }

}


/* =============================================================
   ESCAPE HTML
============================================================= */

function escapeHtml(
  value
) {

  return String(
    value === null ||
    value === undefined
      ? ""
      : value
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =============================================================
   BEFORE PRINT
============================================================= */

window.addEventListener(
  "beforeprint",
  function () {

    if (
      selectedParticipant
    ) {

      const badge =
        document.getElementById(
          "printBadge"
        );


      if (badge) {

        badge.style.display =
          "flex";

      }

    }

  }
);


/* =============================================================
   AFTER PRINT
============================================================= */

window.addEventListener(
  "afterprint",
  function () {

    if (
      selectedParticipant
    ) {

      const badge =
        document.getElementById(
          "printBadge"
        );


      if (badge) {

        badge.style.display =
          "flex";

      }

    }

  }
);