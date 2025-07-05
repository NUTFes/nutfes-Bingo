package routing

import (
	"net/http"

	"api/interface/controller"

	"github.com/labstack/echo/v4"
	echoSwagger "github.com/swaggo/echo-swagger"
)

func NewRouter(nc *controller.NumberController) *echo.Echo {
	e := echo.New()

	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, World! This is Clean Architecture.")
	})

	// Swagger
	e.GET("/swagger/*", echoSwagger.WrapHandler)

	// Numbers API
	numbers := e.Group("/numbers")
	numbers.GET("", nc.GetAllNumbers)
	numbers.POST("", nc.CreateNumber)
	numbers.GET("/:id", nc.GetNumberByID)
	numbers.PUT("/:id", nc.UpdateNumber)
	numbers.DELETE("/:id", nc.DeleteNumber)

	return e
}
