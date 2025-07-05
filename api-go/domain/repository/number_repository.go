package repository

import "api/domain/model"

// NumberRepository は numbers テーブルへのデータ永続化を抽象化するインターフェースです
type NumberRepository interface {
	FindAll() ([]model.Number, error)
	FindByID(id uint) (model.Number, error)
	Create(number model.Number) (model.Number, error)
	Update(number model.Number) (model.Number, error)
	Delete(id uint) error
}
