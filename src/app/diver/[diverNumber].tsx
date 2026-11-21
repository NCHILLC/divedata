import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { parseDiverProfile } from '../../divemeets/parsers';
import { usePage } from '../../divemeets/source';
import { useFollows } from '../../follows';
import { Body, Button, Card, Heading, Num, PageView, placeWords, points, Screen, styles, Title } from '../../ui';

export default function Diver() {
  const { diverNumber } = useLocalSearchParams<{ diverNumber: string }>();
  const { state, reload } = usePage(`profile.php?number=${Number(diverNumber)}`, parseDiverProfile);
  const { isFollowed, toggle } = useFollows();

  return (
    <Screen title="Diver">
      <PageView state={state} reload={reload}>
        {({ diver, meets }) => {
          const following = isFollowed(diver.diverNumber);
          return (
            <>
              <Title>{diver.name}</Title>
              <Button
                label={following ? `Stop following ${diver.name}` : `Follow ${diver.name}`}
                filled={!following}
                onPress={() => toggle(diver)}
              />
              {meets.length === 0 && <Body muted>No results on DiveMeets yet.</Body>}
              {meets.map((m) => (
                <View key={m.meetNumber} style={styles.block}>
                  <Heading>{m.name}</Heading>
                  {m.events.map((e, i) => {
                    const sheet = e.diveSheetPath;
                    return (
                      <Card
                        key={i}
                        label={`${e.name}, place ${placeWords(e)}, total ${points(e.total)}. Open the dives`}
                        onPress={() => sheet && router.push({ pathname: '/dives', params: { path: sheet } })}
                      >
                        <Body>{e.name}</Body>
                        <Num>{`Place ${placeWords(e)} · Total ${points(e.total)}`}</Num>
                      </Card>
                    );
                  })}
                </View>
              ))}
            </>
          );
        }}
      </PageView>
    </Screen>
  );
}
