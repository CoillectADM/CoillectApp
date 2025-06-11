import { CreateUserDto } from 'src/user/dto/create-user.dto/create-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto/update-user.dto';

export default function process_data_nasc<
  T extends CreateUserDto | Partial<UpdateUserDto>,
>(toProcess: T, data_nasc: string): T {
  const chunks = data_nasc.split('/');

  const data_nasc_obj = new Date(
    parseInt(chunks[2]),
    parseInt(chunks[1]) - 1,
    parseInt(chunks[0]),
  );

  const user: T = {
    ...toProcess,
    data_nascimento: data_nasc_obj,
  };

  return user;
}
