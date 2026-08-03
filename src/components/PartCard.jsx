import React from "react";
import { Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import "./CardStyles.css";
import partsService from "../service/partsService";

const buildImageUrl = (img) =>
  !img
    ? ""
    : /^https?:\/\//i.test(img)
      ? img
      : `${partsService.partImageUrl}${img.startsWith("/") ? img : `/${img}`}`;

function PartCard(props) {
  const imageUrl = buildImageUrl(props.photo);
  const formattedPrice = `$${parseFloat(props.price || 0).toFixed(2)}`;

  return (
    <div className="single-item">
      <Link
        className="card-click-target"
        to={`/browse/part/${props.id}`}
        aria-label={`View ${props.name || "part"}`}
      >
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
                <div className="item-image item-image--empty">No Image</div>
              )}
            </Card.Title>
            <Card.Text as="div">
              <div className="card-info-wrapper">
                <div className="card-condition-row">
                  <div className="card-text">
                    {props.condition?.name ?? props.conditionName ?? ""}
                  </div>
                </div>
                <div className="card-price">{formattedPrice}</div>
              </div>
            </Card.Text>
            <hr className="card-divider" />
          </Card.Body>

          <Card.Footer>
            <div className="part-name">{props.name}</div>
            <span className="card-button" aria-hidden="true">
              View
            </span>
          </Card.Footer>
        </Card>
      </Link>
    </div>
  );
}

export default PartCard;
