# QuantGuide Question

## 384. Playlist

**Metadata**

- ID: `a8UvPwZuwz5CPWL3oM0z`
- URL: https://www.quantguide.io/questions/playlist
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: original
- Tags: Events
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

Drew is creating a playlist. There are 147 songs in the playlist, of which 4 are written by DaBaby and 6 are written by Rae Sremmurd. Drew randomly orders all of the songs in the playlist. Find the probability all of the Rae Sremmurd songs in the playlist come before the second DaBaby song.

### Hint

The other songs besides those by DaBaby and Rae Sremmurd don't matter. Consider the arrangements of the 10 songs by those two.

### 解答

By exchangeability, we can just consider the first 10 songs in the playlist as being all Rae Sremmurd songs or DaBaby songs (since there are 6 Rae Sremmurd and 4 DaBaby). Consider 10 blanks. If all of the Rae Sremmurd songs come before the 2nd DaBaby song, the last 3 blanks must all be DaBaby songs. In the first 7 spots, there are $P(7,6) = \dfrac{7!}{1!} = 7!$ ways to permute the 6 DaBaby songs to the first $7$ blanks. In the remaining $4$ blanks, they must be DaBaby songs, so there are $4!$ ways to arrange the 4 DaBaby songs in the remaining blanks. There are $10!$ total ways to arrange the order of the songs, so our answer is $\dfrac{7!4!}{10!} = \dfrac{24}{10 \cdot 8 \cdot 9} = \dfrac{1}{30}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/30"
    ],
    "difficulty": "easy",
    "id": "a8UvPwZuwz5CPWL3oM0z",
    "internalDifficulty": 1,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 2965532,
    "source": "original",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Playlist",
    "topic": "probability",
    "urlEnding": "playlist"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "a8UvPwZuwz5CPWL3oM0z",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Playlist",
    "topic": "probability",
    "urlEnding": "playlist"
  }
}
```
