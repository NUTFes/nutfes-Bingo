package datastore

import (
	"api/domain/model"
	"api/domain/repository"

	"gorm.io/gorm"
)

type numberRepository struct {
	db *gorm.DB
}

func NewNumberRepository(db *gorm.DB) repository.NumberRepository {
	return &numberRepository{db}
}

func (nr *numberRepository) FindAll() ([]model.Number, error) {
	var numbers []model.Number
	if err := nr.db.Order("created_at desc").Find(&numbers).Error; err != nil {
		return nil, err
	}
	return numbers, nil
}

func (nr *numberRepository) FindByID(id uint) (model.Number, error) {
	var number model.Number
	if err := nr.db.First(&number, id).Error; err != nil {
		return number, err
	}
	return number, nil
}

func (nr *numberRepository) Create(number model.Number) (model.Number, error) {
	if err := nr.db.Create(&number).Error; err != nil {
		return number, err
	}
	return number, nil
}

func (nr *numberRepository) Update(number model.Number) (model.Number, error) {
	if err := nr.db.Save(&number).Error; err != nil {
		return number, err
	}
	return number, nil
}

func (nr *numberRepository) Delete(id uint) error {
	if err := nr.db.Delete(&model.Number{}, id).Error; err != nil {
		return err
	}
	return nil
}
