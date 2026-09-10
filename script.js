/* =====================================================
   CABARRUS FLOOD SMART INTAKE
   SCRIPT
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  console.log("Cabarrus Flood Smart Intake script loaded.");

  const pinInput = document.getElementById("pinInput");
  const searchButton = document.getElementById("searchButton");

  const statusMessage =
    document.getElementById("statusMessage");

  const statusDot =
    document.getElementById("statusDot");


  /* ===================================================
     CONFIRM REQUIRED ELEMENTS EXIST
  =================================================== */

  if (!pinInput) {
    console.error("ERROR: pinInput was not found.");
  }

  if (!searchButton) {
    console.error("ERROR: searchButton was not found.");
  }


  /* ===================================================
     BUTTON CLICK
  =================================================== */

  if (searchButton) {

    searchButton.addEventListener(
      "click",
      function () {

        searchProperty();

      }
    );

  }


  /* ===================================================
     ENTER KEY
  =================================================== */

  if (pinInput) {

    pinInput.addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Enter") {

          event.preventDefault();

          searchProperty();

        }

      }
    );

  }


  /* ===================================================
     MAIN PROPERTY SEARCH
  =================================================== */

  async function searchProperty() {

    console.log("Search button clicked.");

    const searchValue =
      pinInput.value.trim();


    /* -----------------------------------------------
       VALIDATE INPUT
    ----------------------------------------------- */

    if (!searchValue) {

      updateStatus(
        "Please enter a Property PIN before searching.",
        "error"
      );

      return;

    }


    /* -----------------------------------------------
       IMMEDIATE VISUAL RESPONSE
    ----------------------------------------------- */

    resetResults();


    document.getElementById(
      "searchInput"
    ).textContent = searchValue;


    updateStatus(
      "Search started. Connecting to public GIS data...",
      "loading"
    );


    document.getElementById(
      "propertyStatus"
    ).textContent =
      "Searching...";


    searchButton.disabled = true;


    searchButton.textContent =
      "Searching...";


    console.log(
      "Searching for:",
      searchValue
    );


    try {


      /*
        =================================================
        TEMPORARY TEST
        =================================================

        This confirms that the button and JavaScript
        workflow are working BEFORE we troubleshoot
        the GIS endpoint.
      */


      await new Promise(function (resolve) {

        setTimeout(resolve, 500);

      });


      updateStatus(
        "The Search button is working. Next, we need to reconnect the confirmed working Cabarrus GIS property search.",
        "success"
      );


      document.getElementById(
        "propertyStatus"
      ).textContent =
        "Search button working";


      console.log(
        "Search button and JavaScript are working."
      );


    } catch (error) {


      console.error(
        "Search error:",
        error
      );


      updateStatus(
        "An error occurred while processing the search.",
        "error"
      );


      document.getElementById(
        "propertyStatus"
      ).textContent =
        "Search Error";


    } finally {


      searchButton.disabled = false;


      searchButton.textContent =
        "🔎 Search GIS";

    }

  }


  /* ===================================================
     UPDATE STATUS
  =================================================== */

  function updateStatus(
    message,
    statusType
  ) {

    if (statusMessage) {

      statusMessage.textContent =
        message;

    }


    if (statusDot) {

      statusDot.classList.remove(
        "success",
        "error",
        "loading"
      );


      if (statusType) {

        statusDot.classList.add(
          statusType
        );

      }

    }

  }


  /* ===================================================
     RESET RESULTS
  =================================================== */

  function resetResults() {


    const fields = [

      "searchInput",
      "oldPinResult",
      "pin14Result",
      "ownerResult",
      "municipalJurisdiction"

    ];


    fields.forEach(function (id) {

      const element =
        document.getElementById(id);


      if (element) {

        element.textContent = "—";

      }

    });


    const propertyStatus =
      document.getElementById(
        "propertyStatus"
      );


    if (propertyStatus) {

      propertyStatus.textContent =
        "Searching...";

    }


    const geographicStatus =
      document.getElementById(
        "geographicStatus"
      );


    if (geographicStatus) {

      geographicStatus.textContent =
        "Waiting for property identification";

    }


    const buildingCodeJurisdiction =
      document.getElementById(
        "buildingCodeJurisdiction"
      );


    if (buildingCodeJurisdiction) {

      buildingCodeJurisdiction.textContent =
        "Municipal location has not yet been identified.";

    }


    document
      .querySelectorAll(".workflow-step")
      .forEach(function (step) {

        step.classList.remove("active");

      });

  }


});
