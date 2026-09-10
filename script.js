/* =====================================================
   CABARRUS FLOOD SMART INTAKE
   PROPERTY IDENTIFICATION & GIS SEARCH
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  console.log("Cabarrus Flood Smart Intake script loaded.");


  /* ===================================================
     CABARRUS COUNTY GIS ENDPOINT
  =================================================== */

  const TAX_PARCELS_URL =
    "https://location.cabarruscounty.us/arcgisservices/rest/services/OpenData/Tax_Parcels/MapServer/1/query";


  /* ===================================================
     TODAY'S TEST / DEMONSTRATION PIN

     This is a LEGACY / OLD PIN used to demonstrate
     the application workflow.

     PIN information may be updated nightly, so the
     Current PIN is treated as a separate identifier.
  =================================================== */

  const TODAY_TEST_OLD_PIN = "556744376";


  /* ===================================================
     PAGE ELEMENTS
  =================================================== */

  const pinInput =
    document.getElementById("pinInput");

  const searchButton =
    document.getElementById("searchButton");

  const statusMessage =
    document.getElementById("statusMessage");

  const statusDot =
    document.getElementById("statusDot");


  /* ===================================================
     CONFIRM REQUIRED ELEMENTS
  =================================================== */

  if (!pinInput) {
    console.error("ERROR: #pinInput was not found.");
  }

  if (!searchButton) {
    console.error("ERROR: #searchButton was not found.");
  }


  /* ===================================================
     LOAD TODAY'S TEST PIN
  =================================================== */

  if (pinInput && !pinInput.value.trim()) {
    pinInput.value = TODAY_TEST_OLD_PIN;
  }


  /* ===================================================
     SEARCH BUTTON
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

    if (!pinInput) return;


    const searchValue =
      pinInput.value.trim();


    /* -----------------------------------------------
       VALIDATE INPUT
    ----------------------------------------------- */

    if (!searchValue) {

      updateStatus(
        "Please enter a Property PIN, Legacy PIN, Old PIN, or Parcel Number.",
        "error"
      );

      setText(
        "propertyStatus",
        "Search Required"
      );

      return;

    }


    /* -----------------------------------------------
       RESET SCREEN
    ----------------------------------------------- */

    resetResults();


    setText(
      "searchInput",
      searchValue
    );


    setText(
      "propertyStatus",
      "Searching..."
    );


    updateStatus(
      "Searching property identification records...",
      "loading"
    );


    setSearchButtonState(
      true,
      "Searching..."
    );


    console.log(
      "Searching for:",
      searchValue
    );


    try {


      /* ===============================================
         TODAY'S DEMONSTRATION RECORD

         The application recognizes today's Legacy PIN
         so we have a stable demonstration workflow.
      =============================================== */

      if (
        normalizeValue(searchValue) ===
        normalizeValue(TODAY_TEST_OLD_PIN)
      ) {

        await delay(500);


        displayDemoProperty(
          searchValue
        );


        return;

      }


      /* ===============================================
         LIVE GIS SEARCH
      =============================================== */

      updateStatus(
        "Searching Cabarrus County public GIS parcel data...",
        "loading"
      );


      const property =
        await searchCabarrusGIS(
          searchValue
        );


      if (!property) {

        updateStatus(
          "No matching property was found in the public Cabarrus County parcel data.",
          "error"
        );


        setText(
          "propertyStatus",
          "Property Not Found"
        );


        setText(
          "geographicStatus",
          "Property could not be identified"
        );


        return;

      }


      displayProperty(
        property,
        searchValue
      );


      updateStatus(
        "Property identified successfully. Parcel information is ready for the next screening step.",
        "success"
      );


      activateWorkflowThrough(2);


    } catch (error) {

      console.error(
        "PROPERTY SEARCH ERROR:",
        error
      );


      updateStatus(
        "The GIS search could not be completed. Please try again.",
        "error"
      );


      setText(
        "propertyStatus",
        "Search Error"
      );


    } finally {

      setSearchButtonState(
        false,
        "🔎 Search GIS"
      );

    }

  }


  /* ===================================================
     TODAY'S DEMONSTRATION PROPERTY
  =================================================== */

  function displayDemoProperty(searchValue) {


    setText(
      "searchInput",
      searchValue
    );


    /* LEGACY / OLD PIN */

    setText(
      "oldPinResult",
      "556744376.0000000"
    );


    /* CURRENT PIN

       We deliberately do NOT call the old PIN the
       Current PIN.

       The real Current PIN should ultimately come
       from the nightly-updated Cabarrus parcel data.
    */

    setText(
      "pin14Result",
      "Current PIN pending live GIS verification"
    );


    setText(
      "ownerResult",
      "Demonstration Property Record"
    );


    setText(
      "propertyStatus",
      "Property Identified"
    );


    setText(
      "municipalJurisdiction",
      "Ready for geographic jurisdiction screening"
    );


    setText(
      "geographicStatus",
      "Property identified — ready for jurisdiction and flood screening"
    );


    setText(
      "buildingCodeJurisdiction",
      "Property identification complete. Live jurisdiction determination will be added in the next phase."
    );


    updateStatus(
      "Property identified successfully using today's demonstration Legacy PIN.",
      "success"
    );


    /* STORE PROPERTY */

    window.currentProperty = {

      searchValue:
        searchValue,

      isDemo:
        true,

      oldPin:
        "556744376.0000000",

      currentPin:
        null,

      geometry:
        null

    };


    activateWorkflowThrough(2);


    console.log(
      "Demonstration property loaded:",
      window.currentProperty
    );

  }


  /* ===================================================
     SEARCH LIVE CABARRUS GIS
  =================================================== */

  async function searchCabarrusGIS(searchValue) {


    const cleanValue =
      searchValue
        .trim()
        .replace(/,/g, "");


    const escapedValue =
      cleanValue.replace(/'/g, "''");


    /* SEARCH MULTIPLE IDENTIFIER TYPES */

    const whereConditions = [

      "OLDPIN = '" + escapedValue + "'",

      "OLDPIN LIKE '" + escapedValue + "%'",

      "PIN14 = '" + escapedValue + "'",

      "PIN = '" + escapedValue + "'",

      "PARCEL = '" + escapedValue + "'",

      "PropertyReal_ID = '" + escapedValue + "'"

    ];


    for (
      let i = 0;
      i < whereConditions.length;
      i++
    ) {

      const whereClause =
        whereConditions[i];


      console.log(
        "Trying GIS query:",
        whereClause
      );


      try {

        const result =
          await queryGIS(whereClause);


        if (
          result &&
          result.features &&
          result.features.length > 0
        ) {

          return result.features[0];

        }

      } catch (error) {

        console.warn(
          "GIS query failed:",
          whereClause,
          error
        );

      }

    }


    return null;

  }


  /* ===================================================
     QUERY GIS
  =================================================== */

  async function queryGIS(whereClause) {


    const parameters =
      new URLSearchParams();


    parameters.set("f", "json");

    parameters.set(
      "where",
      whereClause
    );

    parameters.set(
      "outFields",
      "*"
    );

    parameters.set(
      "returnGeometry",
      "true"
    );

    parameters.set(
      "outSR",
      "4326"
    );

    parameters.set(
      "resultRecordCount",
      "10"
    );


    const requestURL =
      TAX_PARCELS_URL +
      "?" +
      parameters.toString();


    const response =
      await fetch(requestURL);


    if (!response.ok) {

      throw new Error(
        "GIS server returned HTTP " +
        response.status
      );

    }


    const data =
      await response.json();


    if (data.error) {

      throw new Error(
        data.error.message ||
        "ArcGIS query failed."
      );

    }


    return data;

  }


  /* ===================================================
     DISPLAY LIVE PROPERTY
  =================================================== */

  function displayProperty(
    feature,
    searchValue
  ) {


    const attributes =
      feature.attributes || {};


    setText(
      "searchInput",
      searchValue
    );


    /* LEGACY PIN */

    setText(
      "oldPinResult",
      getFirstValue(
        attributes.OLDPIN,
        attributes.OLD_PIN,
        "—"
      )
    );


    /* CURRENT PIN */

    setText(
      "pin14Result",
      getFirstValue(
        attributes.PIN14,
        attributes.PIN,
        "—"
      )
    );


    /* OWNER */

    const owner =
      combineOwnerName(
        attributes.AcctName1,
        attributes.AcctName2
      );


    setText(
      "ownerResult",
      owner ||
      getFirstValue(
        attributes.OWNER,
        "—"
      )
    );


    setText(
      "propertyStatus",
      "Property Identified"
    );


    setText(
      "municipalJurisdiction",
      "Ready for geographic jurisdiction screening"
    );


    setText(
      "geographicStatus",
      "Property geometry identified and ready for screening"
    );


    setText(
      "buildingCodeJurisdiction",
      "Property identified. Jurisdiction screening is ready for the next workflow step."
    );


    window.currentProperty = {

      searchValue:
        searchValue,

      isDemo:
        false,

      oldPin:
        attributes.OLDPIN || null,

      currentPin:
        attributes.PIN14 ||
        attributes.PIN ||
        null,

      attributes:
        attributes,

      geometry:
        feature.geometry || null

    };


    activateWorkflowThrough(2);

  }


  /* ===================================================
     COMBINE OWNER NAME
  =================================================== */

  function combineOwnerName(
    name1,
    name2
  ) {

    const names = [];


    if (name1 && String(name1).trim()) {
      names.push(String(name1).trim());
    }


    if (name2 && String(name2).trim()) {
      names.push(String(name2).trim());
    }


    return names.join(" ");

  }


  /* ===================================================
     FIRST AVAILABLE VALUE
  =================================================== */

  function getFirstValue() {

    for (
      let i = 0;
      i < arguments.length;
      i++
    ) {

      const value =
        arguments[i];


      if (
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      ) {

        return String(value);

      }

    }


    return "—";

  }


  /* ===================================================
     NORMALIZE VALUE
  =================================================== */

  function normalizeValue(value) {

    return String(value)
      .trim()
      .replace(/,/g, "")
      .replace(/\.0+$/, "");

  }


  /* ===================================================
     DELAY
  =================================================== */

  function delay(milliseconds) {

    return new Promise(
      function (resolve) {

        setTimeout(
          resolve,
          milliseconds
        );

      }
    );

  }


  /* ===================================================
     UPDATE STATUS
  =================================================== */

  function updateStatus(
    message,
    statusType
  ) {

    if (statusMessage) {
      statusMessage.textContent = message;
    }


    if (statusDot) {

      statusDot.classList.remove(
        "success",
        "error",
        "loading"
      );


      if (statusType) {
        statusDot.classList.add(statusType);
      }

    }

  }


  /* ===================================================
     SET TEXT
  =================================================== */

  function setText(
    elementId,
    value
  ) {

    const element =
      document.getElementById(elementId);


    if (element) {
      element.textContent = value;
    }

  }


  /* ===================================================
     BUTTON STATE
  =================================================== */

  function setSearchButtonState(
    disabled,
    text
  ) {

    if (!searchButton) return;


    searchButton.disabled = disabled;

    searchButton.textContent = text;

  }


  /* ===================================================
     ACTIVATE WORKFLOW
  =================================================== */

  function activateWorkflowThrough(stepNumber) {

    document
      .querySelectorAll(".workflow-step")
      .forEach(function (step, index) {

        step.classList.remove("active");


        if (index < stepNumber) {
          step.classList.add("active");
        }

      });

  }


  /* ===================================================
     RESET RESULTS
  =================================================== */

  function resetResults() {


    [
      "oldPinResult",
      "pin14Result",
      "ownerResult",
      "municipalJurisdiction"
    ].forEach(function (id) {

      setText(id, "—");

    });


    setText(
      "propertyStatus",
      "Searching..."
    );


    setText(
      "geographicStatus",
      "Waiting for property identification"
    );


    setText(
      "buildingCodeJurisdiction",
      "Municipal location has not yet been identified."
    );


    document
      .querySelectorAll(".workflow-step")
      .forEach(function (step) {

        step.classList.remove("active");

      });


    window.currentProperty = null;

  }


  console.log(
    "Cabarrus Flood Smart Intake is ready."
  );


});
