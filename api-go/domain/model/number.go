package model

import "time"

// Number は public.numbers テーブルのモデルです
type Number struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Number    int       `json:"number" gorm:"not null"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}