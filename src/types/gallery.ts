export interface PhotoCard {
  id: number
  text: string
  image: string | null
}

export interface GalleryAlbum {
  id: string | number
  name: string
  desc: string
  route: string
  image: string | null
  placeholder: string
}
