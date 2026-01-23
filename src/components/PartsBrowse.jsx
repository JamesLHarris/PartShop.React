import { useOutletContext } from "react-router-dom";
import partsService from "../service/partsService";
import toastr from "toastr";
import { useEffect, useMemo, useState } from "react";
import PartCard from "./PartCard";

function PartsBrowse() {
  const { filters, pageIndex, setPageIndex, pageSize, setPageSize, pageSizes } =
    useOutletContext();

  const [vm, setVm] = useState({
    items: [],
    totalCount: 0,
  });

  useEffect(() => {
    const loadParts = async () => {
      try {
        let response;

        // Priority: Model -> Category -> Recently listed
        if (filters?.modelId) {
          response = await partsService.getByModelCustomer(
            pageIndex,
            pageSize,
            filters.modelId
          );
        } else if (filters?.categoryId) {
          response = await partsService.getByCategoryCustomer(
            pageIndex,
            pageSize,
            filters.categoryId
          );
        } else {
          // Default: recently listed / all available
          response = await partsService.getAllAvailablePartsCustomer(
            pageIndex,
            pageSize
          );
        }

        const paged = response.item;
        const items = paged?.pagedItems ?? [];
        const total = paged?.totalCount ?? 0;

        setVm({
          items,
          totalCount: total,
        });
      } catch (err) {
        console.error("Failed to load parts on Browse.", err);
        toastr.error("Failed to load parts on Browse.", "Error");
      }
    };

    loadParts();
  }, [filters, pageIndex, pageSize]);

  const cards = useMemo(
    () =>
      vm.items.map((part) => (
        <PartCard
          key={part.id}
          id={part.id}
          name={part.name}
          make={part.make?.company}
          condition={part.condition}
          tested={part.tested}
          rusted={part.rusted}
          photo={part.image}
          price={part.price}
          description={part.description}
        />
      )),
    [vm.items]
  );

  const totalPages = Math.max(1, Math.ceil(vm.totalCount / pageSize));

  return (
    <>
      <div className="part-grid">{cards}</div>

      <div className="pageModifier">
        <div className="pageSize-Selector">
          <label>Page:</label>
          <div className="page-buttons">
            {Array.from({ length: totalPages }).map((_, i) => (
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
                setPageIndex(0);
              }}
              className={pageSize === size ? "active" : ""}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

export default PartsBrowse;
