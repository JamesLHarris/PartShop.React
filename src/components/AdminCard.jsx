import React from "react";
import { Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import partsService from "../service/partsService";
import "./CardStyles.css";

const buildImageUrl = (image) =>
  !image
    ? ""
    : /^https?:\/\//i.test(image)
      ? image
      : `${partsService.partImageUrl}${
          image.startsWith("/") ? image : `/${image}`
        }`;

const buildLocationText = ({
  siteName,
  boxName,
  otherBox,
}) => {
  const values = [
    siteName,
    boxName,
    otherBox,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return values.length > 0 ? values.join(" • ") : "Location not assigned";
};

function AdminCard(props) {
  const navigate = useNavigate();

  const partClickEvent = () => {
    navigate(`/admin/part/${props.id}`);
  };

  const imageUrl = buildImageUrl(props.photo);
  const formattedPrice = `$${parseFloat(props.price || 0).toFixed(2)}`;
  const locationText = buildLocationText(props);

  return (
    <div className="single-item admin-search-card">
      <Card>
        <Card.Body>
          <Card.Title>
            {imageUrl ? (
              <img
                src={imageUrl}
                className="item-image"
                alt={props.name || "Part"}
              />
            ) : (
              <div className="item-image item-image--empty">
                No Image
              </div>
            )}
          </Card.Title>

          <Card.Text as="div">
            <div className="card-info-wrapper">
              <div className="card-condition-row">
                <div className="card-text">
                  {props.condition?.name ??
                    props.conditionName ??
                    ""}
                </div>
              </div>

              <div className="card-price">{formattedPrice}</div>

              <div className="admin-card-summary">
                {props.partNumber && (
                  <div title={props.partNumber}>
                    <strong>Part #:</strong> {props.partNumber}
                  </div>
                )}

                <div>
                  <strong>Quantity:</strong>{" "}
                  {Number(props.quantity || 0)}
                </div>

                {props.availableStatus && (
                  <div>
                    <strong>Status:</strong> {props.availableStatus}
                  </div>
                )}

                <div
                  className="admin-card-location"
                  title={locationText}
                >
                  <strong>Location:</strong> {locationText}
                </div>
              </div>
            </div>
          </Card.Text>

          <hr className="card-divider" />
        </Card.Body>

        <Card.Footer>
          <div className="part-name">{props.name}</div>

          <button
            type="button"
            className="card-button"
            onClick={partClickEvent}
          >
            View
          </button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default AdminCard;
