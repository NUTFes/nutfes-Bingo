package controller

import (
	"api/usecase"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"
)

// HTTPError example
type HTTPError struct {
	Message string `json:"message"`
}

type NumberController struct {
	uc usecase.NumberUsecase
}

func NewNumberController(uc usecase.NumberUsecase) *NumberController {
	return &NumberController{uc: uc}
}

// GetAllNumbers godoc
// @Summary      Get all numbers
// @Description  Get all bingo numbers that have been drawn
// @Tags         numbers
// @Accept       json
// @Produce      json
// @Success      200  {array}   model.Number
// @Failure      500  {object}  HTTPError
// @Router       /numbers [get]
func (nc *NumberController) GetAllNumbers(c echo.Context) error {
	numbers, err := nc.uc.GetAllNumbers()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, numbers)
}

// GetNumberByID godoc
// @Summary      Get a number by ID
// @Description  Get a single bingo number by its ID
// @Tags         numbers
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Number ID"
// @Success      200  {object}  model.Number
// @Failure      400  {object}  HTTPError
// @Failure      404  {object}  HTTPError
// @Failure      500  {object}  HTTPError
// @Router       /numbers/{id} [get]
func (nc *NumberController) GetNumberByID(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "Invalid ID")
	}
	number, err := nc.uc.GetNumberByID(uint(id))
	if err != nil {
		return c.JSON(http.StatusNotFound, "Number not found")
	}
	return c.JSON(http.StatusOK, number)
}

type CreateNumberRequest struct {
	Number int `json:"number" binding:"required"`
}

// CreateNumber godoc
// @Summary      Create a new number
// @Description  Add a new bingo number
// @Tags         numbers
// @Accept       json
// @Produce      json
// @Param        number  body      CreateNumberRequest  true  "Number to create"
// @Success      201     {object}  model.Number
// @Failure      400     {object}  HTTPError
// @Failure      500     {object}  HTTPError
// @Router       /numbers [post]
func (nc *NumberController) CreateNumber(c echo.Context) error {
	var req CreateNumberRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, err.Error())
	}
	number, err := nc.uc.CreateNumber(req.Number)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusCreated, number)
}

type UpdateNumberRequest struct {
	Number int `json:"number" binding:"required"`
}

// UpdateNumber godoc
// @Summary      Update a number
// @Description  Update an existing bingo number by its ID
// @Tags         numbers
// @Accept       json
// @Produce      json
// @Param        id      path      int                  true  "Number ID"
// @Param        number  body      UpdateNumberRequest  true  "New number value"
// @Success      200     {object}  model.Number
// @Failure      400     {object}  HTTPError
// @Failure      404     {object}  HTTPError
// @Failure      500     {object}  HTTPError
// @Router       /numbers/{id} [put]
func (nc *NumberController) UpdateNumber(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "Invalid ID")
	}
	var req UpdateNumberRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, err.Error())
	}
	number, err := nc.uc.UpdateNumber(uint(id), req.Number)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.JSON(http.StatusOK, number)
}

// DeleteNumber godoc
// @Summary      Delete a number
// @Description  Delete a bingo number by its ID
// @Tags         numbers
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Number ID"
// @Success      204  {object}  nil
// @Failure      400  {object}  HTTPError
// @Failure      500  {object}  HTTPError
// @Router       /numbers/{id} [delete]
func (nc *NumberController) DeleteNumber(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, "Invalid ID")
	}
	if err := nc.uc.DeleteNumber(uint(id)); err != nil {
		return c.JSON(http.StatusInternalServerError, err.Error())
	}
	return c.NoContent(http.StatusNoContent)
}
