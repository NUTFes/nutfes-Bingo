package usecase

import (
	"api/domain/model"
	"api/domain/repository"
)

// NumberUsecase は number に関するビジネスロジックを定義するインターフェースです
type NumberUsecase interface {
	GetAllNumbers() ([]model.Number, error)
	GetNumberByID(id uint) (model.Number, error)
	CreateNumber(number int) (model.Number, error)
	UpdateNumber(id uint, numberValue int) (model.Number, error)
	DeleteNumber(id uint) error
}

type numberUsecase struct {
	numberRepo repository.NumberRepository
}

// NewNumberUsecase は NumberUsecase の実装を返します
func NewNumberUsecase(nr repository.NumberRepository) NumberUsecase {
	return &numberUsecase{numberRepo: nr}
}

func (nu *numberUsecase) GetAllNumbers() ([]model.Number, error) {
	return nu.numberRepo.FindAll()
}

func (nu *numberUsecase) GetNumberByID(id uint) (model.Number, error) {
	return nu.numberRepo.FindByID(id)
}

func (nu *numberUsecase) CreateNumber(numberValue int) (model.Number, error) {
	number := model.Number{Number: numberValue}
	return nu.numberRepo.Create(number)
}

func (nu *numberUsecase) UpdateNumber(id uint, numberValue int) (model.Number, error) {
	number, err := nu.numberRepo.FindByID(id)
	if err != nil {
		return model.Number{}, err
	}
	number.Number = numberValue
	return nu.numberRepo.Update(number)
}

func (nu *numberUsecase) DeleteNumber(id uint) error {
	return nu.numberRepo.Delete(id)
}
