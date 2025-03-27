import { Outlet } from "react-router-dom";
import DogCard from "./DogCard";
import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import engine from "../itemPhotos/engine.png";
import centerConsole from "../itemPhotos/center_console.png";
import lugNut from "../itemPhotos/lug_nut.png";
import reservoirCap from "../itemPhotos/washer_reservoir.png";
import partsService from "../service/partsService";
import toastr from "toastr";
import PartCard from "./PartCard";

function Layout() {
  var dog1 = {
    name: "Porsche 911 S 2.7 L Engine ",
    model: "911",
    condition: "USED",
    descriptionId: 2,
    photo: engine,
    price: 20.0,
  };
  var dog2 = {
    name: "Porsche Cayenne Washer Reservoir Cap",
    model: "Bolt",
    condition: "NEW",
    descriptionId: 3,
    photo: reservoirCap,
    price: 13.62,
  };
  var dog3 = {
    name: "Porsche 911 / Boxster / Cayman Wheel Lug Bolt (45 mm)",
    model: "Bolt",
    condition: "NEW",
    descriptionId: 3,
    photo: lugNut,
    price: 27.89,
  };
  var dog4 = {
    name: "Porsche 911 Center Console with Switches",
    model: "Bolt",
    condition: "USED",
    descriptionId: 2,
    photo: centerConsole,
    price: 2.48,
  };

  var dogArray = [dog1, dog2, dog3, dog4, dog1, dog2, dog3, dog4];

  const [dogData, setDogData] = useState({
    dogsUnmapped: [],
    dogsComponents: [],
  });

  const [partData, setPartData] = useState({
    partsUnmapped: [],
    partsComponents: [],
  });

  const [pageData] = useState({
    pageIndex: 0,
    pageSize: 5,
  });

  const mapDogs = (dog) => {
    return (
      <DogCard
        name={dog.name}
        breed={dog.model}
        condition={dog.condition}
        descId={dog.descriptionId}
        photo={dog.photo}
        price={dog.price}
      />
    );
  };

  const mapParts = (part) => {
    return (
      <PartCard
        name={part.name}
        breed={part.make.company}
        condition={part.condition}
        photo={part.photo}
      />
    );
  };

  useEffect(
    () =>
      setDogData((prevState) => {
        var dogArray = [dog1, dog2, dog3, dog4, dog1, dog2, dog3, dog4, dog1];
        const pd = { ...prevState };
        pd.dogsUnmapped = dogArray;
        pd.dogsComponents = pd.dogsUnmapped.map(mapDogs);
        return pd;
      }),
    []
  );

  useEffect(() => {
    partsService
      .getAllParts(pageData.pageIndex, pageData.pageSize)
      .then(onGetUserSurveySuccess)
      .catch(onGetError);
  }, []);

  const onGetUserSurveySuccess = (response) => {
    let getData = response.item.pagedItems;
    setPartData((prevState) => {
      const pd = { ...prevState };
      let filteredData = getData.filter((part) => part.available.id === 1);
      pd.partsComponents = filteredData.map(mapParts);
      pd.partsUnmapped = getData;
      return pd;
    });
  };

  const onGetError = () => {
    toastr.error("Failed to load parts on PartsPage.", "Error");
  };

  const [filteredPartData, filterPartData] = useState({
    partsUnmapped: [],
    partsMapped: [],
    partsComponents: [],
  });

  const filterPartsFunction = () => {
    filterPartData((prevState) => {
      var partArray = dogArray;
      let pd = { ...prevState };
      pd.partsUnmapped = partArray;
      pd.partsMapped = pd.partsUnmapped.filter(
        (part) => part.descriptionId === 3
      );
      pd.partsComponents = pd.partsMapped.map(mapDogs);
      return pd;
    });
  };

  return (
    <div className="layout-wrapper">
      <div className="part-grid">{partData.partsComponents}</div>
      <div className="dog-grid">{dogData.dogsComponents}</div>
      <Outlet />
    </div>
  );
}

export default Layout;
