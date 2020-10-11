import { BaseEntity, CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export class BaseModel extends BaseEntity {

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt: Date
}

export class BaseModelWithID extends BaseModel {

  @PrimaryGeneratedColumn()
  id: number
}