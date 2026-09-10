/* =====================================================
   CABARRUS FLOOD SMART INTAKE
   LIVE PROPERTY SEARCH
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  /* ===================================================
     PUBLIC GIS ENDPOINT
  =================================================== */

  const TAX_PARCELS_URL =
    "https://location.cabarruscounty.us/arcgisservices/rest/services/OpenData/Tax_Parcels/MapServer/1/query";


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
     STARTUP CHECK
  =================================================== */

  console.log("========================================");
  console.log("CABARRUS FLOOD SMART INTAKE");
  console.log("LIVE GIS SEARCH SCRIPT LOADED");
  console.log("========================================");

  if (!pinInput) {
    console.error("ERROR: pinInput was not found.");
  }

  if (!searchButton) {
    console.error("ERROR: searchButton was not found.");
  }

  if (!pinInput || !searchButton) {
    return;
  }


  /* ===================================================
     SEARCH BUTTON
  =================================================== */

  searchButton.addEventListener(
    "click",
    function () {
      searchProperty();
    }
  );


  /* ===================================================
     ENTER KEY
  =================================================== */

  pinInput.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Enter") {

        event.preventDefault();

        searchProperty();

      }

    }
  );


  /* ===================================================
     MAIN PROPERTY SEARCH
  =================================================== */

  async function searchProperty() {

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

      return;

    }


    console.log("========================================");
    console.log("STARTING PROPERTY SEARCH");
    console.log("SEARCH VALUE:", searchValue);
    console.log("========================================");


    /* -----------------------------------------------
       RESET DISPLAY
    ----------------------------------------------- */

    resetResults();


    setText(
      "searchInput",
      searchValue
    );


    setText(
      "propertyStatus",
      "Searching public GIS..."
    );


    updateStatus(
      "Searching Cabarrus County public parcel data...",
      "loading"
    );


    searchButton.disabled = true;

    searchButton.textContent =
      "Searching...";


    try {


      /* ===============================================
         SEARCH PARCEL DATA
      =============================================== */

      const result =
        await searchParcel(searchValue);


      /* -----------------------------------------------
         NO RESULT
      ----------------------------------------------- */

      if (!result) {

        console.warn(
          "No matching property found."
        );


        setText(
          "propertyStatus",
          "Property Not Found"
        );


        updateStatus(
          "No matching property was found. Try a Current PIN, Legacy PIN, Old PIN, or Parcel Number.",
          "error"
        );


        return;

      }


      /* ===============================================
         PROPERTY FOUND
      =============================================== */

      const attributes =
        result.attributes || {};


      console.log("========================================");
      console.log("PROPERTY FOUND");
      console.log("ATTRIBUTES:", attributes);
      console.log("GEOMETRY:", result.geometry);
      console.log("========================================");


      /* -----------------------------------------------
         GET PROPERTY IDENTIFIERS
      ----------------------------------------------- */

      const oldPin =
        getValue(
          attributes,
          [
            "OLDPIN",
            "OldPIN"
          ]
        );


      const currentPin =
        getValue(
          attributes,
          [
            "PIN14",
            "PIN"
          ]
        );


      const owner =
        getValue(
          attributes,
          [
            "AcctName1",
            "OWNER",
            "OWNERNAME",
            "OwnerName"
          ]
        );


      /* -----------------------------------------------
         POPULATE PROPERTY PROFILE
      ----------------------------------------------- */

      setText(
        "oldPinResult",
        oldPin
      );


      setText(
        "pin14Result",
        currentPin
      );


      setText(
        "ownerResult",
        owner
      );


      setText(
        "propertyStatus",
        "Property Identified"
      );


      /* -----------------------------------------------
         ACTIVATE WORKFLOW
      ----------------------------------------------- */

      activateStep("step1");


      if (result.geometry) {

        activateStep("step2");

      }


      /* -----------------------------------------------
         SUCCESS MESSAGE
      ----------------------------------------------- */

      updateStatus(
        "Property identified successfully. Parcel geometry is available for the next screening step.",
        "success"
      );


      /* ===============================================
         JURISDICTION PLACEHOLDER
      =============================================== */

      if (result.geometry) {

        setText(
          "municipalJurisdiction",
          "Parcel geometry retrieved"
        );


        setText(
          "geographicStatus",
          "Ready for jurisdiction screening"
        );


        setText(
          "buildingCodeJurisdiction",
          "Property geometry identified. Municipal and building code authority screening is ready for the next step."
        );

      } else {

        setText(
          "municipalJurisdiction",
          "Property found - geometry unavailable"
        );


        setText(
          "geographicStatus",
          "Property identified"
        );

      }


    } catch (error) {


      console.error(
        "========================================"
      );

      console.error(
        "GIS SEARCH ERROR:",
        error
      );

      console.error(
        "========================================"
      );


      setText(
        "propertyStatus",
        "GIS Search Error"
      );


      updateStatus(
        "Unable to complete the Cabarrus County GIS search. Please try again.",
        "error"
      );


    } finally {


      searchButton.disabled = false;


      searchButton.textContent =
        "🔎 Search GIS";

    }

  }


  /* ===================================================
     SEARCH PARCEL
  =================================================== */

  async function searchParcel(searchValue) {


    /* -----------------------------------------------
       CLEAN INPUT
    ----------------------------------------------- */

    const cleanValue =
      String(searchValue)
        .trim();


    const escapedValue =
      escapeSql(cleanValue);


    /*
      Some Cabarrus legacy identifiers may appear
      with decimal formatting.
    */

    const decimalValue =
      cleanValue.includes(".")
        ? cleanValue
        : cleanValue + ".0000000";


    const escapedDecimalValue =
      escapeSql(decimalValue);


    /* ===============================================
       SEARCH STRATEGIES

       We try exact matches first.

       Then legacy formatting.

       Then starts-with matching.
    =============================================== */

    const searches = [

      /* --------------------------------------------
         CURRENT PIN14 EXACT
      -------------------------------------------- */

      {
        name: "PIN14 exact",
        where:
          `PIN14 = '${escapedValue}'`
      },


      /* --------------------------------------------
         CURRENT PIN EXACT
      -------------------------------------------- */

      {
        name: "PIN exact",
        where:
          `PIN = '${escapedValue}'`
      },


      /* --------------------------------------------
         OLD PIN EXACT
      -------------------------------------------- */

      {
        name: "OLDPIN exact",
        where:
          `OLDPIN = '${escapedValue}'`
      },


      /* --------------------------------------------
         OLD PIN DECIMAL FORMAT
      -------------------------------------------- */

      {
        name: "OLDPIN decimal format",
        where:
          `OLDPIN = '${escapedDecimalValue}'`
      },


      /* --------------------------------------------
         PIN14 STARTS WITH
      -------------------------------------------- */

      {
        name: "PIN14 starts with",
        where:
          `PIN14 LIKE '${escapedValue}%'`
      },


      /* --------------------------------------------
         PIN STARTS WITH
      -------------------------------------------- */

      {
        name: "PIN starts with",
        where:
          `PIN LIKE '${escapedValue}%'`
      },


      /* --------------------------------------------
         OLDPIN STARTS WITH

         This is particularly important for
         Legacy PIN searches.
      -------------------------------------------- */

      {
        name: "OLDPIN starts with",
        where:
          `OLDPIN LIKE '${escapedValue}%'`
      },


      /* --------------------------------------------
         OLDPIN CONTAINS
      -------------------------------------------- */

      {
        name: "OLDPIN contains",
        where:
          `OLDPIN LIKE '%${escapedValue}%'`
      }

    ];


    /* ===============================================
       TRY EACH SEARCH
    =============================================== */

    for (const search of searches) {


      console.log("----------------------------------------");

      console.log(
        "TRYING SEARCH:",
        search.name
      );

      console.log(
        "WHERE:",
        search.where
      );


      const params =
        new URLSearchParams({

          f: "json",

          where:
            search.where,

          outFields:
            "*",

          returnGeometry:
            "true",

          resultRecordCount:
            "10"

        });


      const url =
        `${TAX_PARCELS_URL}?${params.toString()}`;


      console.log(
        "REQUEST URL:",
        url
      );


      const response =
        await fetch(url);


      if (!response.ok) {

        console.warn(
          "GIS HTTP ERROR:",
          response.status
        );

        continue;

      }


      const data =
        await response.json();


      console.log(
        "GIS RESPONSE:",
        data
      );


      /* --------------------------------------------
         ARCGIS ERROR
      -------------------------------------------- */

      if (data.error) {

        console.warn(
          "ARCGIS ERROR:",
          data.error
        );

        continue;

      }


      /* --------------------------------------------
         FEATURES FOUND
      -------------------------------------------- */

      if (
        data.features &&
        data.features.length > 0
      ) {

        console.log(
          "PROPERTY MATCH FOUND USING:",
          search.name
        );


        return data.features[0];

      }

    }


    /* ===============================================
       NO PROPERTY FOUND
    =============================================== */

    return null;

  }


  /* ===================================================
     GET ATTRIBUTE VALUE
  =================================================== */

  function getValue(
    attributes,
    fieldNames
  ) {

    for (const field of fieldNames) {

      const value =
        attributes[field];


      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {

        return value;

      }

    }


    return "—";

  }


  /* ===================================================
     SET TEXT SAFELY
  =================================================== */

  function setText(
    id,
    value
  ) {

    const element =
      document.getElementById(id);


    if (element) {

      element.textContent =
        value ?? "—";

    }

  }


  /* ===================================================
     ESCAPE SQL
  =================================================== */

  function escapeSql(value) {

    return String(value)
      .replace(/'/g, "''");

  }


  /* ===================================================
     UPDATE STATUS
  =================================================== */

  function updateStatus(
    message,
    type
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


      if (type) {

        statusDot.classList.add(type);

      }

    }

  }


  /* ===================================================
     ACTIVATE WORKFLOW STEP
  =================================================== */

  function activateStep(stepId) {

    const step =
      document.getElementById(stepId);


    if (step) {

      step.classList.add("active");

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

      setText(
        id,
        "—"
      );

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

  }


});
