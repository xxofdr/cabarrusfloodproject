document.addEventListener("DOMContentLoaded", function () {

  // =====================================================
  // CABARRUS FLOOD SMART INTAKE
  // PROPERTY IDENTIFICATION ENGINE - VERSION 1
  // =====================================================


  // =====================================================
  // HTML ELEMENTS
  // =====================================================

  const searchButton =
    document.querySelector("#searchButton");

  const propertyInput =
    document.querySelector("#pinInput");

  const searchInputResult =
    document.querySelector("#searchInput");

  const oldPinResult =
    document.querySelector("#oldPinResult");

  const pin14Result =
    document.querySelector("#pin14Result");

  const ownerResult =
    document.querySelector("#ownerResult");

  const propertyStatus =
    document.querySelector("#propertyStatus");

  const statusMessage =
    document.querySelector("#statusMessage");


  // =====================================================
  // WORKFLOW ELEMENTS
  // =====================================================

  const step1 =
    document.querySelector("#step1");

  const step2 =
    document.querySelector("#step2");


  // =====================================================
  // VERIFIED CABARRUS COUNTY PUBLIC OPENDATA SERVICE
  // =====================================================

  const parcelService =
    "https://location.cabarruscounty.us/arcgisservices/rest/services/OpenData/Tax_Parcels/MapServer/1/query";


  // =====================================================
  // SAFETY CHECK
  // =====================================================

  if (
    !searchButton ||
    !propertyInput ||
    !searchInputResult ||
    !oldPinResult ||
    !pin14Result ||
    !ownerResult ||
    !propertyStatus ||
    !statusMessage
  ) {

    console.error(
      "Flood Smart Intake Error: Required HTML elements were not found."
    );

    return;
  }


  // =====================================================
  // NORMALIZE PROPERTY IDENTIFIER
  // =====================================================

  function normalizeSearchValue(value) {

    return value
      .trim()
      .replace(/[\s-]/g, "")
      .replace(/\.0+$/, "");
  }


  // =====================================================
  // ESCAPE VALUE FOR ARCGIS SQL
  // =====================================================

  function escapeSqlValue(value) {

    return value.replace(/'/g, "''");
  }


  // =====================================================
  // UPDATE WORKFLOW
  // =====================================================

  function updateWorkflow(hasGeometry) {

    if (step1) {
      step1.classList.add("active");
    }

    if (step2) {

      if (hasGeometry) {
        step2.classList.add("active");
      } else {
        step2.classList.remove("active");
      }

    }

  }


  // =====================================================
  // RESET PROPERTY RESULTS
  // =====================================================

  function resetResults(searchValue) {

    searchInputResult.textContent =
      searchValue || "—";

    oldPinResult.textContent =
      "—";

    pin14Result.textContent =
      "—";

    ownerResult.textContent =
      "—";

  }


  // =====================================================
  // BUILD SEARCH VALUES
  //
  // Creates several reasonable variations so that:
  //
  // 5567444376
  // 556-744-4376
  // 5567444376.00000000
  //
  // can be handled intelligently.
  // =====================================================

  function buildSearchValues(searchValue) {

    const normalized =
      normalizeSearchValue(searchValue);

    const values =
      new Set();

    if (normalized) {

      values.add(normalized);

      values.add(
        normalized + ".00000000"
      );

    }

    return Array.from(values);

  }


  // =====================================================
  // BUILD ARCGIS WHERE CLAUSE
  // =====================================================

  function buildWhereClause(searchValues) {

    const conditions = [];

    searchValues.forEach(function (value) {

      const safeValue =
        escapeSqlValue(value);

      conditions.push(
        "PIN = '" + safeValue + "'"
      );

      conditions.push(
        "PIN14 = '" + safeValue + "'"
      );

      conditions.push(
        "OLDPIN = '" + safeValue + "'"
      );

    });

    return conditions.join(" OR ");

  }


  // =====================================================
  // SEARCH FUNCTION
  // =====================================================

  async function searchProperty() {

    const originalSearchValue =
      propertyInput.value.trim();


    // =================================================
    // VALIDATE SEARCH
    // =================================================

    if (!originalSearchValue) {

      statusMessage.textContent =
        "Please enter a Property PIN, Legacy PIN, or Parcel Number.";

      propertyStatus.textContent =
        "Waiting for valid search input";

      propertyInput.focus();

      return;
    }


    // =================================================
    // NORMALIZE SEARCH
    // =================================================

    const normalizedSearchValue =
      normalizeSearchValue(originalSearchValue);

    const searchValues =
      buildSearchValues(originalSearchValue);


    // =================================================
    // START SEARCH
    // =================================================

    searchButton.disabled =
      true;

    searchButton.textContent =
      "Searching...";


    statusMessage.textContent =
      "Searching Cabarrus County public property GIS...";


    propertyStatus.textContent =
      "Searching GIS...";


    resetResults(originalSearchValue);


    try {


      // ===============================================
      // BUILD WHERE CLAUSE
      // ===============================================

      const whereClause =
        buildWhereClause(searchValues);


      // ===============================================
      // QUERY PARAMETERS
      // ===============================================

      const params =
        new URLSearchParams({

          where: whereClause,

          outFields:
            "PIN14,PIN,OLDPIN,AcctName1,AcctName2,CALCULATED_ACREAGE,PropertyReal_ID,PARCEL",

          returnGeometry:
            "true",

          outSR:
            "4326",

          f:
            "json"

        });


      // ===============================================
      // BUILD REQUEST URL
      // ===============================================

      const requestURL =
        parcelService +
        "?" +
        params.toString();


      console.log(
        "Cabarrus OpenData GIS Request:",
        requestURL
      );


      // ===============================================
      // CALL PUBLIC GIS SERVICE
      // ===============================================

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


      console.log(
        "Cabarrus OpenData GIS Response:",
        data
      );


      // ===============================================
      // GIS ERROR CHECK
      // ===============================================

      if (data.error) {

        throw new Error(
          data.error.message ||
          "Cabarrus GIS returned an error."
        );

      }


      // ===============================================
      // NO PROPERTY FOUND
      // ===============================================

      if (
        !data.features ||
        data.features.length === 0
      ) {

        statusMessage.textContent =
          "No matching property was found in the Cabarrus County public parcel data.";

        propertyStatus.textContent =
          "Property Not Found";

        updateWorkflow(false);

        return;

      }


      // ===============================================
      // GET FIRST MATCHING PROPERTY
      // ===============================================

      const feature =
        data.features[0];


      const attributes =
        feature.attributes || {};


      const geometry =
        feature.geometry || null;


      // ===============================================
      // PROPERTY IDENTIFIERS
      // ===============================================

      searchInputResult.textContent =
        originalSearchValue;


      oldPinResult.textContent =
        attributes.OLDPIN ||
        "Not Available";


      pin14Result.textContent =
        attributes.PIN14 ||
        attributes.PIN ||
        "Not Available";


      // ===============================================
      // OWNER NAME
      // ===============================================

      const ownerParts = [];


      if (attributes.AcctName1) {

        ownerParts.push(
          attributes.AcctName1
        );

      }


      if (attributes.AcctName2) {

        ownerParts.push(
          attributes.AcctName2
        );

      }


      const ownerName =
        ownerParts.length > 0
          ? ownerParts.join(" ")
          : "Not Available";


      ownerResult.textContent =
        ownerName;


      // ===============================================
      // PROPERTY STATUS
      // ===============================================

      propertyStatus.textContent =
        "Property Identified";


      // ===============================================
      // STATUS MESSAGE
      // ===============================================

      if (geometry) {

        statusMessage.textContent =
          "Property identified successfully. Parcel geometry is available and ready for the next screening step.";

      } else {

        statusMessage.textContent =
          "Property identified successfully, but parcel geometry was not returned.";

      }


      // ===============================================
      // STORE PROPERTY DATA
      //
      // This becomes the foundation for:
      //
      // Step 2 - Geometry
      // Step 3 - Jurisdiction
      // Step 4 - Flood Hazard
      // Step 5 - Regulatory Gate
      // ===============================================

      window.currentProperty = {

        searchValue:
          originalSearchValue,

        normalizedSearchValue:
          normalizedSearchValue,

        pin:
          attributes.PIN || null,

        pin14:
          attributes.PIN14 || null,

        oldPin:
          attributes.OLDPIN || null,

        parcel:
          attributes.PARCEL || null,

        owner:
          ownerName,

        acreage:
          attributes.CALCULATED_ACREAGE || null,

        realId:
          attributes.PropertyReal_ID || null,

        geometry:
          geometry

      };


      console.log(
        "Current Property:",
        window.currentProperty
      );


      // ===============================================
      // UPDATE WORKFLOW
      // ===============================================

      updateWorkflow(
        geometry !== null
      );


    }


    // =================================================
    // ERROR HANDLING
    // =================================================

    catch (error) {

      console.error(
        "Cabarrus OpenData GIS Search Error:",
        error
      );


      statusMessage.textContent =
        "Unable to retrieve property information. " +
        "Please try again or check the browser console for details.";


      propertyStatus.textContent =
        "GIS Search Error";


      oldPinResult.textContent =
        "—";

      pin14Result.textContent =
        "—";

      ownerResult.textContent =
        "—";


      updateWorkflow(false);

    }


    // =================================================
    // RESTORE BUTTON
    // =================================================

    finally {

      searchButton.disabled =
        false;


      searchButton.textContent =
        "🔎 Search GIS";

    }

  }


  // =====================================================
  // SEARCH BUTTON CLICK
  // =====================================================

  searchButton.addEventListener(
    "click",
    searchProperty
  );


  // =====================================================
  // ENTER KEY
  // =====================================================

  propertyInput.addEventListener(
    "keydown",
    function (event) {

      if (event.key === "Enter") {

        searchProperty();

      }

    }
  );


});
