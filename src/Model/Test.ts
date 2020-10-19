import { Column, Entity } from 'typeorm'
import { BaseModelWithID } from './Base/BaseModel'

@Entity()
export class Test extends BaseModelWithID {

  @Column()
  title: string

  @Column({ default: null })
  description?: string
}