import { observer } from 'mobx-react';
import React, { Component } from 'react';
import { Input, InputContainer, StyledAddressBar } from './styles';
import Store from '../../store';
import { isURL } from '../../utils/url';
import Suggestions from '../Suggestions';
import SuggestionItem from '../../models/suggestion-item';

interface Props {
  visible: boolean;
}

@observer
export default class AddressBar extends Component<Props, {}> {
  private input: HTMLInputElement;
  private canSuggest = false;
  private lastSuggestion: SuggestionItem;

  public componentDidMount() {
    window.addEventListener('mousedown', () => {
      Store.addressBar.toggled = false;
      Store.suggestions.clear();
    });
  }

  public onInputFocus = () => {
    this.input.select();
  };

  public autoComplete(suggestion: SuggestionItem, text: string) {
    const regex = /(http(s?)):\/\/(www.)?|www./gi;
    const regex2 = /(http(s?)):\/\//gi;

    const start = text.length;

    if (suggestion) {
      const { secondaryText } = suggestion;

      if (secondaryText.startsWith(text.replace(regex, ''))) {
        this.input.value = text + secondaryText.replace(text.replace(regex, ''), '');
      } else if (`www.${secondaryText}`.startsWith(text.replace(regex2, ''))) {
        this.input.value = text + `www.${secondaryText}`.replace(text.replace(regex2, ''), '');
      }
      this.input.setSelectionRange(start, this.input.value.length);
    }
  }

  public onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.keyCode;

    if (
      key !== 8 && // backspace
      key !== 13 && // enter
      key !== 17 && // ctrl
      key !== 18 && // alt
      key !== 16 && // shift
      key !== 9 && // tab
      key !== 20 && // capslock
      key !== 46 && // delete
      key !== 32 // space
    ) {
      this.canSuggest = true;
    }

    if (e.keyCode === 38 || e.keyCode === 40) {
      e.preventDefault();
      if (e.keyCode === 40) {
        Store.suggestions.selectNext();
      } else if (e.keyCode === 38) {
        Store.suggestions.selectPrevious();
      }

      const suggestion = Store.suggestions.getSelected();

      if (
        suggestion.type === 'history' ||
        suggestion.type === 'bookmarks' ||
        suggestion.type === 'most-visited'
      ) {
        this.input.value = suggestion.secondaryText;
      } else {
        this.input.value = suggestion.primaryText;
      }
    }
  };

  public onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.which === 13) {
      // Enter.
      const tabGroup = Store.getCurrentTabGroup();
      const tab = tabGroup.getSelectedTab();

      e.preventDefault();

      const text = e.currentTarget.value;
      let url = text;

      if (isURL(text) && !text.includes('://')) {
        url = `http://${text}`;
      } else if (!text.includes('://')) {
        url = `https://www.google.com/search?q=${text}`;
      }

      this.input.value = url;

      const page = Store.getPageById(tab.id);

      page.url = url;

      Store.addressBar.toggled = false;
    }
  };

  public onInput = async () => {
    const text = this.input.value;
    if (this.canSuggest) {
      this.autoComplete(this.lastSuggestion, text);
    }

    await Store.suggestions.load(text);

    if (this.canSuggest) {
      const suggestion = Store.suggestions.suggest();
      this.lastSuggestion = suggestion;
      this.autoComplete(suggestion, text);
      this.canSuggest = false;
    }
  };

  public render() {
    const { visible } = this.props;

    if (Store.addressBar.toggled) {
      const page = Store.getSelectedPage();
      if (page.webview != null && page.webview.getWebContents() != null) {
        this.input.value = page.webview.getURL();
      }

      this.input.focus();
    }

    return (
      <StyledAddressBar visible={visible}>
        <InputContainer>
          <Input
            innerRef={r => (this.input = r)}
            onFocus={this.onInputFocus}
            onMouseDown={e => e.stopPropagation()}
            placeholder="Search"
            onInput={this.onInput}
            visible={Store.addressBar.toggled}
            onKeyPress={this.onKeyPress}
            onKeyDown={this.onKeyDown}
            style={{ ...Store.theme.theme.searchBar.style }}
          />
          <Suggestions />
        </InputContainer>
      </StyledAddressBar>
    );
  }
}
