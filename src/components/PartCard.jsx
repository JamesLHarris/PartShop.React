import React from "react";
import { Card } from "react-bootstrap";
import "./CardStyles.css";
import { useNavigate } from "react-router-dom";
import partsService from "../service/partsService";

const buildImageUrl = (img) =>
  !img
    ? ""
    : /^https?:\/\//i.test(img)
      ? img
      : `${partsService.partImageUrl}${img.startsWith("/") ? img : `/${img}`}`;

function PartCard(props) {
  const navigate = useNavigate();

  const partClickEvent = () => {
    navigate(`part/${props.id}`);
    console.log("Selected Customer Card:", props);
  };

  const imageUrl = buildImageUrl(props.photo);
  const formattedPrice = `$${parseFloat(props.price || 0).toFixed(2)}`;

  return (
    <div className="single-item">
      <Card>
        <Card.Body>
          <Card.Title>
            {imageUrl ? (
              <img src={imageUrl} className="item-image" alt="item" />
            ) : (
              <div className="item-image item-image--empty">No Image</div>
            )}
          </Card.Title>
          <Card.Text>
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
          <button className="card-button" onClick={partClickEvent}>
            View
          </button>
        </Card.Footer>
      </Card>
    </div>
  );
}

export default PartCard;
