import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import partsService from "../service/partsService";
import toastr from "toastr";
import PartCard from "./PartCard";

function Layout() {
  const [partData, setPartData] = useState({
    partsUnmapped: [],
    partsComponents: [],
    totalCount: 0,
  });

  const [pageIndex, setPageIndex] = useState(0); // starts at 0
  const [pageSize, setPageSize] = useState(10); // default page size
  const pageSizes = [10, 20, 30];

  const mapParts = (part) => (
    <PartCard
      name={part.name}
      make={part.make.company}
      condition={part.condition}
      tested={part.tested}
      rusted={part.rusted}
      photo={part.image}
      price={part.price}
      description={part.description}
    />
  );

  const loadParts = () => {
    partsService
      .getAllAvailablePartsCustomer(pageIndex, pageSize)
      .then(onGetPartSuccess)
      .catch(onGetError);
  };

  useEffect(() => {
    loadParts();
  }, [pageIndex, pageSize]);

  const onGetPartSuccess = (response) => {
    let getData = response.item.pagedItems;
    const total = response.item.totalCount || 0;

    setPartData({
      partsUnmapped: getData,
      partsComponents: getData.map(mapParts),
      totalCount: total,
    });
  };

  const onGetError = () => {
    toastr.error("Failed to load parts on PartsPage.", "Error");
  };

  const totalPages = Math.ceil(partData.totalCount / pageSize);

  return (
    <div className="layout-wrapper">
      <div className="part-grid">{partData.partsComponents}</div>

      {/* Page size selector */}
      <div className="pageModifier">
        {/* Page navigation */}
        <div className="pageSize-Selector">
          <label>Page:</label>
          <div className="page-buttons">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPageIndex(i)}
                className={pageIndex === i ? "active" : ""}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
        <div className="pageIndex-Selector">
          <label>Page Size:</label>
          {pageSizes.map((size) => (
            <button
              key={size}
              onClick={() => {
                setPageSize(size);
                setPageIndex(0); // reset to first page when size changes
              }}
              className={pageSize === size ? "active" : ""}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}

export default Layout;
